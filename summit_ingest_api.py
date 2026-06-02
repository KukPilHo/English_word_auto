"""
Summit AI - 추출/검토 API (로컬 전용, INGEST_MODE 에서만 등록).

운영(HF) 빌드에는 INGEST_MODE 미설정 → 라우트 자체가 등록되지 않는다.
검토 대기열(staging)과 확정 저장(summit_json append)을 담당.
"""

import os
import json
import glob
import time
import uuid

from flask import request, jsonify, send_file, abort
from werkzeug.utils import secure_filename

import summit_pdf
import summit_extract
import summit_ingest

_HERE = os.path.dirname(os.path.abspath(__file__))
STAGING_DIR = os.path.join(_HERE, "staging")
INGEST_UPLOAD_DIR = os.path.join(_HERE, "uploads", "ingest")


def _ensure_dirs():
    os.makedirs(STAGING_DIR, exist_ok=True)
    os.makedirs(INGEST_UPLOAD_DIR, exist_ok=True)


def _batch_path(batch_id):
    return os.path.join(STAGING_DIR, f"{secure_filename(batch_id)}.json")


def _load_batch(batch_id):
    p = _batch_path(batch_id)
    if not os.path.exists(p):
        return None
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_batch(batch):
    p = _batch_path(batch["batch_id"])
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(batch, f, ensure_ascii=False, indent=2)
    os.replace(tmp, p)


def register(app, reload_cb):
    """ingest 라우트를 app에 등록. reload_cb: 확정 후 SUMMIT_DB 재적재 콜백."""
    _ensure_dirs()

    @app.route("/api/ingest/upload", methods=["POST"])
    def ingest_upload():
        if "pdf" not in request.files:
            return jsonify({"error": "pdf 파일이 필요합니다."}), 400
        grade = request.form.get("grade", "")
        if grade not in summit_ingest.VALID_GRADES:
            return jsonify({"error": f"grade 무효: {grade!r}"}), 400
        f = request.files["pdf"]
        job_id = uuid.uuid4().hex[:12]
        safe = secure_filename(f.filename) or "upload.pdf"
        pdf_path = os.path.join(INGEST_UPLOAD_DIR, f"{job_id}.pdf")
        f.save(pdf_path)
        meta = summit_pdf.analyze_pdf(pdf_path)
        return jsonify({
            "job_id": job_id, "grade": grade, "source_pdf": safe,
            "is_scanned": meta["is_scanned"], "page_count": meta["page_count"],
        })

    @app.route("/api/ingest/extract", methods=["POST"])
    def ingest_extract():
        body = request.get_json(force=True) or {}
        job_id = body.get("job_id", "")
        grade = body.get("grade", "")
        page_limit = body.get("page_limit")
        pdf_path = os.path.join(INGEST_UPLOAD_DIR, f"{secure_filename(job_id)}.pdf")
        if not os.path.exists(pdf_path):
            return jsonify({"error": "job_id 에 해당하는 PDF 없음"}), 404
        if grade not in summit_ingest.VALID_GRADES:
            return jsonify({"error": f"grade 무효: {grade!r}"}), 400

        result = summit_extract.run_pipeline(
            pdf_path, grade, page_limit=page_limit, verbose=True)

        batch_id = f"ing-{time.strftime('%Y%m%d-%H%M%S')}"
        batch = {
            "batch_id": batch_id,
            "job_id": job_id,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "source_pdf": body.get("source_pdf", ""),
            "grade": grade,
            "target_file": f"summit_json/{grade}.json",
            "status": "reviewing",
            "meta": result["meta"],
            "skipped_non_grammar": result["skipped_non_grammar"],
            "drafts": result["drafts"],
        }
        _save_batch(batch)
        return jsonify(batch)

    @app.route("/api/ingest/batches", methods=["GET"])
    def ingest_batches():
        out = []
        for p in sorted(glob.glob(os.path.join(STAGING_DIR, "*.json")), reverse=True):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    b = json.load(f)
                drafts = b.get("drafts", [])
                out.append({
                    "batch_id": b["batch_id"], "grade": b.get("grade"),
                    "source_pdf": b.get("source_pdf"), "created_at": b.get("created_at"),
                    "status": b.get("status"), "total": len(drafts),
                    "confirmed": sum(1 for d in drafts if d.get("status") == "confirmed"),
                })
            except Exception:  # noqa: BLE001
                continue
        return jsonify(out)

    @app.route("/api/ingest/batch/<batch_id>", methods=["GET"])
    def ingest_batch(batch_id):
        b = _load_batch(batch_id)
        if not b:
            return jsonify({"error": "batch 없음"}), 404
        return jsonify(b)

    @app.route("/api/ingest/draft", methods=["PUT"])
    def ingest_update_draft():
        body = request.get_json(force=True) or {}
        batch_id = body.get("batch_id")
        draft_id = body.get("draft_id")
        patch = body.get("extracted", {})
        b = _load_batch(batch_id)
        if not b:
            return jsonify({"error": "batch 없음"}), 404
        found = None
        for d in b["drafts"]:
            if d["draft_id"] == draft_id:
                d["extracted"].update(patch)
                if d.get("status") in (None, "needs_review"):
                    d["status"] = "edited"
                found = d
                break
        if not found:
            return jsonify({"error": "draft 없음"}), 404
        _save_batch(b)
        return jsonify(found)

    @app.route("/api/ingest/confirm", methods=["POST"])
    def ingest_confirm():
        body = request.get_json(force=True) or {}
        batch_id = body.get("batch_id")
        draft_ids = body.get("draft_ids", [])
        b = _load_batch(batch_id)
        if not b:
            return jsonify({"error": "batch 없음"}), 404
        grade = b["grade"]

        # 비문법(제외) 문항은 먼저 승격해야 확정 가능 (은행 오염 방지)
        blocked = [d["draft_id"] for d in b["drafts"]
                   if d["draft_id"] in draft_ids and d.get("status") == "out_of_scope"]
        if blocked:
            return jsonify({"error": "비문법(제외) 문항은 먼저 '어법으로 승격' 후 확정하세요.",
                            "blocked": blocked, "added": 0}), 422

        # 대상 파일 현재 일련번호(중복 없는 id)
        existing = []
        summit_path = os.path.join(_HERE, "summit_json", f"{grade}.json")
        if os.path.exists(summit_path):
            try:
                existing = json.load(open(summit_path, encoding="utf-8")).get("questions", [])
            except Exception:  # noqa: BLE001
                existing = []
        seq = len(existing) + 1

        to_add, errors = [], []
        target_drafts = [d for d in b["drafts"]
                         if d["draft_id"] in draft_ids and d.get("status") != "confirmed"]
        for d in target_drafts:
            q = summit_ingest.map_draft_to_summit(d, grade, seq)
            ok, errs = summit_ingest.validate_summit_question(q)
            if ok:
                to_add.append((d, q))
                seq += 1
            else:
                errors.append({"draft_id": d["draft_id"], "errors": errs})

        if errors:
            return jsonify({"error": "검증 실패", "details": errors, "added": 0}), 422

        added, rejected = summit_ingest.append_summit_questions(
            grade, [q for _, q in to_add])
        for d, q in to_add:
            d["status"] = "confirmed"
            d["confirmed_id"] = q["id"]
        _save_batch(b)

        reload_cb()  # SUMMIT_DB 핫리로드
        return jsonify({"added": len(added), "rejected": rejected,
                        "confirmed_ids": [q["id"] for _, q in to_add]})

    @app.route("/api/ingest/promote", methods=["POST"])
    def ingest_promote():
        """비문법(제외) draft → 어법으로 승격. Stage B(정답풀이+분류) 1회 실행."""
        body = request.get_json(force=True) or {}
        b = _load_batch(body.get("batch_id"))
        if not b:
            return jsonify({"error": "batch 없음"}), 404
        draft = next((d for d in b["drafts"] if d["draft_id"] == body.get("draft_id")), None)
        if not draft:
            return jsonify({"error": "draft 없음"}), 404
        e = draft["extracted"]
        stage_b = None
        try:
            stage_b = summit_extract.stage_b_solve({
                "question": e.get("question", ""), "passage": e.get("passage", ""),
                "options": e.get("options", []),
            })
        except Exception as ex:  # noqa: BLE001
            print(f"  [promote/Stage B] error: {ex}")
        if stage_b:
            e["answer"] = stage_b.get("answer") or e.get("answer", "")
            e["grammar_category"] = stage_b.get("grammar_category", "99-1")
            e["question_type"] = stage_b.get("question_type") or e.get("question_type", "문장형")
            e["explanation"] = stage_b.get("reason", "") or e.get("explanation", "")
            draft["confidence"] = {"answer": stage_b.get("answer_confidence", 0.0),
                                   "classification": stage_b.get("classification_confidence", 0.0)}
            draft["ai_candidates"] = {"grammar_category": stage_b.get("alt", [])}
        draft["is_grammar"] = True
        draft["status"] = "needs_review"
        draft["flags"] = ["비문법→어법 승격 — 확인 필요"]
        _save_batch(b)
        return jsonify(draft)

    @app.route("/api/ingest/reject", methods=["POST"])
    def ingest_reject():
        body = request.get_json(force=True) or {}
        b = _load_batch(body.get("batch_id"))
        if not b:
            return jsonify({"error": "batch 없음"}), 404
        for d in b["drafts"]:
            if d["draft_id"] == body.get("draft_id"):
                d["status"] = "rejected"
        _save_batch(b)
        return jsonify({"ok": True})

    @app.route("/api/ingest/page/<job_id>/<int:page>", methods=["GET"])
    def ingest_page_image(job_id, page):
        pdf_path = os.path.join(INGEST_UPLOAD_DIR, f"{secure_filename(job_id)}.pdf")
        if not os.path.exists(pdf_path):
            abort(404)
        import fitz, io
        doc = fitz.open(pdf_path)
        if page < 0 or page >= doc.page_count:
            doc.close()
            abort(404)
        pix = doc[page].get_pixmap(matrix=fitz.Matrix(150 / 72.0, 150 / 72.0))
        data = pix.tobytes("png")
        doc.close()
        return send_file(io.BytesIO(data), mimetype="image/png")

    print("[Ingest] routes registered (INGEST_MODE).")
