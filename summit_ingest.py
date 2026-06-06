"""
Summit AI - 기출문제(써밋용) 추출 파이프라인 공용 유틸.

이 모듈은 "써밋용" 신규 문제은행 전용이며, 기존 24k 은행(app.py의 load_questions_db)과
완전히 분리되어 있다. 여기서는 다음만 책임진다.
  - 써밋용 raw 스키마 검증 (validator)
  - draft(추출 중간 산출물) -> 써밋용 raw 스키마 매핑 (mapper)
  - 학년/소항목/형식 등 분류 상수 제공

써밋용 raw 스키마 (summit_json/{학년}.json 의 questions[] 원소):
{
  "id": "smt-중3-0007",
  "grade": "중3",               # 파일 단위로 지정 (중1~고3)
  "grammar_category": "2-7",    # 정답 선지가 나타내는 문법 소항목 ID 1개
  "question_type": "지문형",    # 문장형 | 지문형 | 서술형
  "question": "...",
  "passage": "...",             # 없으면 ""
  "options": ["① ...", "..."],  # 서술형이면 [] 가능
  "answer": "4",
  "explanation": "..."          # 참고용(분류 기준 아님)
}
"""

import os
import re
import json

_HERE = os.path.dirname(os.path.abspath(__file__))
_CATEGORIES_PATH = os.path.join(_HERE, "summit_categories.json")

VALID_GRADES = ["중1", "중2", "중3", "고1", "고2", "고3"]
VALID_QUESTION_TYPES = ["문장형", "지문형", "서술형"]
_SUBID_RE = re.compile(r"^\d+-\d+$")

# 써밋용 raw 스키마에서 허용하는 필드(이외는 매핑 시 제거)
SUMMIT_FIELDS = [
    "id", "grade", "grammar_category", "question_type",
    "question", "passage", "options", "answer", "explanation",
]


def _load_categories():
    """summit_categories.json 로드. 실패해도 빈 구조로 graceful degrade."""
    try:
        with open(_CATEGORIES_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:  # noqa: BLE001
        print(f"[summit_ingest] WARN: cannot load summit_categories.json: {e}")
        return {"grades": VALID_GRADES, "questionTypes": VALID_QUESTION_TYPES, "subItems": []}


_CATEGORIES = _load_categories()
VALID_SUBIDS = {item["subId"] for item in _CATEGORIES.get("subItems", [])}
SUBID_LABELS = {item["subId"]: item["label"] for item in _CATEGORIES.get("subItems", [])}


def categories_payload():
    """프론트/프롬프트용 카테고리 페이로드(엔드포인트에서 그대로 반환)."""
    return _CATEGORIES


def grade_to_domain(grade):
    """'중2' -> 'middle-2', '고3' -> 'high-3'. 기존 CategoryTree id 규칙과 호환."""
    grade = (grade or "").strip()
    prefix = "high" if grade.startswith("고") else "middle"
    num = "1"
    if "2" in grade:
        num = "2"
    elif "3" in grade:
        num = "3"
    return f"{prefix}-{num}"


def build_category_id(grade, sub_id):
    """'중2' + '2-7' -> 'middle-2-grammar-2-7' (프론트 CategoryTree 리프 id)."""
    return f"{grade_to_domain(grade)}-grammar-{sub_id}"


def infer_question_type(passage, options, answer, question=""):
    """형식 자동 판정 휴리스틱 (결정4: 서술형 > 지문형 > 문장형).

    확정값이 아니라 '제안'이다. 모호하면 검토 UI에서 사람이 바꾼다.
    - 서술형: 보기가 없고(객관식 아님) 학생이 직접 쓰는 정황.
    - 지문형: passage가 있음.
    - 문장형: 그 외.
    """
    has_passage = bool((passage or "").strip())
    has_options = bool(options) and len(options) > 0
    write_in_hint = any(
        kw in (question or "")
        for kw in ["쓰시오", "쓰시요", "영작", "서술", "배열", "고쳐", "바꿔 쓰", "완성하"]
    )
    if not has_options and (write_in_hint or (answer and len(str(answer)) > 3)):
        return "서술형"
    if has_passage:
        return "지문형"
    return "문장형"


def validate_summit_question(q):
    """써밋용 raw 문항 1건 검증. (ok: bool, errors: list[str]) 반환."""
    errors = []
    if not isinstance(q, dict):
        return False, ["문항이 객체(dict)가 아님"]

    grade = q.get("grade")
    if grade not in VALID_GRADES:
        errors.append(f"grade 무효: {grade!r} (허용: {VALID_GRADES})")

    sub = q.get("grammar_category")
    if not sub or not _SUBID_RE.match(str(sub)):
        errors.append(f"grammar_category 형식 무효: {sub!r} (예: '2-7')")
    elif VALID_SUBIDS and sub not in VALID_SUBIDS:
        errors.append(f"grammar_category 미존재 소항목: {sub!r}")

    qtype = q.get("question_type")
    if qtype not in VALID_QUESTION_TYPES:
        errors.append(f"question_type 무효: {qtype!r} (허용: {VALID_QUESTION_TYPES})")

    if not (q.get("question") or "").strip():
        errors.append("question 비어있음")

    options = q.get("options", [])
    if not isinstance(options, list):
        errors.append("options 는 리스트여야 함")

    # 형식-내용 일관성 경고성 검증
    if qtype == "지문형" and not (q.get("passage") or "").strip():
        errors.append("지문형인데 passage 가 비어있음")
    if qtype == "문장형" and (q.get("passage") or "").strip():
        errors.append("문장형인데 passage 가 존재함")

    return (len(errors) == 0), errors


def map_draft_to_summit(draft, grade, seq):
    """draft(검토 중 산출물) -> 써밋용 raw 스키마.

    draft 는 {"extracted": {...}} 또는 평탄한 dict 모두 허용.
    grade 는 배치 단위 값(파일 단위 지정)을 강제 적용.
    seq 는 파일 내 일련번호(중복 없는 id 생성용).
    """
    src = draft.get("extracted") if isinstance(draft, dict) and "extracted" in draft else draft
    src = src or {}

    options = src.get("options") or []
    if not isinstance(options, list):
        options = [options]

    passage = (src.get("passage") or "").strip()
    answer = src.get("answer", "")
    question = (src.get("question") or "").strip()

    qtype = src.get("question_type") or infer_question_type(passage, options, answer, question)

    out = {
        "id": f"smt-{grade}-{int(seq):04d}",
        "grade": grade,
        "grammar_category": str(src.get("grammar_category") or "99-1"),
        "question_type": qtype,
        "question": question,
        "passage": passage,
        "options": options,
        "answer": answer,
        "explanation": (src.get("explanation") or "").strip(),
    }
    # 허용 필드만 유지
    return {k: out[k] for k in SUMMIT_FIELDS if k in out}


def append_summit_questions(grade, questions, summit_dir=None):
    """검증 통과 문항들을 summit_json/{grade}.json 에 atomic append.

    반환: (added: list, rejected: list[{question, errors}])
    """
    summit_dir = summit_dir or os.path.join(_HERE, "summit_json")
    path = os.path.join(summit_dir, f"{grade}.json")

    # 기존 로드
    data = {"questions": []}
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:  # noqa: BLE001
            data = {"questions": []}
    if "questions" not in data or not isinstance(data["questions"], list):
        data["questions"] = []

    added, rejected = [], []
    for q in questions:
        ok, errors = validate_summit_question(q)
        if ok:
            data["questions"].append(q)
            added.append(q)
        else:
            rejected.append({"question": q, "errors": errors})

    if added:
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp, path)  # atomic

    return added, rejected
