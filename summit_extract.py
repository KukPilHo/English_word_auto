"""
Summit AI - PDF 문항 추출/분류 파이프라인 (OpenAI).

모델 Tiering (결정9):
  Stage A  (MODEL_OCR, nano vision, 페이지당 1콜)
     = S1 OCR + S2 문항분해/지문그룹핑 + S3 문법선별
  Stage B  (MODEL_SOLVE, 상위 모델, 어법 문항만)
     = S4 정답 풀이(추론) + S5 정답기반 76분류

산출물(draft)은 summit_ingest.map_draft_to_summit() 으로 써밋 스키마에 매핑된다.
정답은 AI 추론값이며 반드시 사람 검토로 확정한다(결정7).
"""

import os
import re
import json

from openai import OpenAI
from dotenv import load_dotenv

import summit_pdf
import summit_ingest

load_dotenv()

MODEL_OCR = os.environ.get("MODEL_OCR", "gpt-5.4-nano")
MODEL_SOLVE = os.environ.get("MODEL_SOLVE", "gpt-5.5")

_client = None


def client():
    global _client
    if _client is None:
        _client = OpenAI()  # OPENAI_API_KEY 환경변수 사용
    return _client


# ---------------------------------------------------------------------------
# Stage A: OCR + 문항분해 + 문법선별  (nano vision, 페이지당 1콜)
# ---------------------------------------------------------------------------

_STAGE_A_SCHEMA = {
    "name": "page_questions",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "questions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "number": {"type": "string"},
                        "question": {"type": "string"},
                        "passage": {"type": "string"},
                        "options": {"type": "array", "items": {"type": "string"}},
                        "answer_marked": {"type": "string"},
                        "is_grammar": {"type": "boolean"},
                        "type_guess": {"type": "string", "enum": ["문장형", "지문형", "서술형"]},
                    },
                    "required": [
                        "number", "question", "passage", "options",
                        "answer_marked", "is_grammar", "type_guess",
                    ],
                },
            }
        },
        "required": ["questions"],
    },
}

_STAGE_A_SYSTEM = """너는 한국 영어 내신 시험지를 정확히 디지털화하는 OCR·구조화 전문가다.
주어진 페이지 이미지(좌/우 2단일 수 있음. 왼쪽 단을 먼저, 그다음 오른쪽 단을 읽어라)에서 각 '문항'을 추출한다.

규칙:
- 마커 문자는 반드시 정확한 유니코드로 표기한다: 보기 번호는 ①②③④⑤, 항목 마커는 ⓐⓑⓒⓓⓔⓕ.
  절대로 'a','(a)','@','©','(1)','1.' 같은 대체 표기로 바꾸지 말 것(원 안의 글자/숫자는 원문자 그대로).
- 밑줄은 <u>...</u> 로 표기한다.
- question: 발문(번호 포함 가능). passage: 지문/대화가 있으면 원문, 없으면 "".
- ★보기 박스(평가 대상 문장 묶음): 문항에 ⓐⓑⓒ…(또는 (A)(B)(C)…)로 표시된 문장/항목들이 박스 안에 나열되고,
  ①②③ 번호 보기가 그 마커들의 조합(예 "①ⓐⓕ", "③ⓐⓒⓕ")을 가리키는 '모두 고른 것/짝지은 것' 유형이면,
  그 박스 전체를 passage 에 담는다. 각 항목은 'ⓐ 문장내용' 형태로 마커를 붙여 한 줄씩 모두 적고, 절대 누락하지 말 것.
- options: ①②③ 번호 보기 배열(예 "① ..."). ★박스 안 ⓐ~ⓕ 문장을 options 에 넣지 말 것(그것은 passage). 보기가 없으면 [].
- answer_marked: 시험지에 정답 표시가 있으면 그 값, 없으면 "" (대부분 없음 — 추측하지 말 것).
- is_grammar: 어법/문법을 묻는 문항이면 true, 독해·어휘·대의파악 등이면 false.
- type_guess: 지문 있으면 '지문형', 학생이 직접 쓰면 '서술형', 그 외 '문장형'.
- 여러 문항이 한 지문을 공유하면 각 문항에 동일 지문을 채운다.
- 페이지에 잘린(다음 장 계속) 문항은 보이는 만큼만 추출한다.
오직 지정된 JSON 스키마로만 답한다."""


def _group_by_page(rendered):
    by_page = {}
    for ch in rendered:
        by_page.setdefault(ch["page"], []).append(ch)
    return [by_page[p] for p in sorted(by_page)]


def stage_a_page(image_chunks, model=None):
    """페이지 1장(컬럼 이미지 1~2개) → 문항 리스트. nano vision 1콜."""
    model = model or MODEL_OCR
    content = [{"type": "text", "text": "이 페이지의 모든 문항을 추출하라. 좌측 단 → 우측 단 순서."}]
    for ch in image_chunks:
        content.append({"type": "image_url", "image_url": {"url": ch["image"]}})
    resp = client().chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": _STAGE_A_SYSTEM},
            {"role": "user", "content": content},
        ],
        response_format={"type": "json_schema", "json_schema": _STAGE_A_SCHEMA},
    )
    data = json.loads(resp.choices[0].message.content)
    return data.get("questions", [])


_STAGE_A_TEXT_SYSTEM = """너는 한국 영어 내신 시험지의 '텍스트 추출본'을 문항 단위로 구조화하는 전문가다.
입력은 PDF 텍스트 레이어에서 뽑은 한 페이지 분량의 글이다(2단이 한 줄로 섞였을 수 있으니 문맥으로 문항 경계를 복원하라).

규칙(stage_a_page 와 동일 스키마):
- 페이지에 있는 모든 '문항'을 분리한다. 한 페이지에 여러 문항이 있으면 각각 별도로.
- 마커 문자는 정확한 유니코드로: 보기 번호 ①②③④⑤, 항목 마커 ⓐⓑⓒⓓⓔⓕ. 'a','(a)','@','©' 등 대체표기 금지.
  (텍스트 추출본에는 밑줄 정보가 없을 수 있다 — 있으면 <u>...</u>.)
- question: 발문(번호 포함 가능). passage: 지문/대화가 있으면 원문, 없으면 "".
- ★보기 박스: ⓐⓑⓒ…로 나열된 문장/항목 묶음을 ①②③ 보기가 조합으로 가리키는 '모두 고른 것/짝지은 것' 유형이면,
  그 묶음 전체를 passage 에 'ⓐ 문장내용' 형태로 한 줄씩 마커를 붙여 모두 담는다(누락 금지). options 에는 넣지 말 것.
- options: 번호 보기 배열. 없으면 [].
- answer_marked: 본문에 정답 표시가 있으면 그 값, 없으면 "".
- is_grammar: 어법/문법을 묻는 문항이면 true, 독해·어휘(영영풀이)·대의 등이면 false.
- type_guess: 지문 있으면 '지문형', 학생이 직접 쓰면 '서술형', 그 외 '문장형'.
- 머리말(학교명/시험명/광고 배너 등)은 문항이 아니므로 제외한다.
오직 지정된 JSON 스키마로만 답한다."""


def stage_a_text(page_text, model=None):
    """페이지 텍스트 → 문항 리스트. nano 텍스트 1콜 (디지털 PDF 경로)."""
    model = model or MODEL_OCR
    resp = client().chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": _STAGE_A_TEXT_SYSTEM},
            {"role": "user", "content": page_text or ""},
        ],
        response_format={"type": "json_schema", "json_schema": _STAGE_A_SCHEMA},
    )
    data = json.loads(resp.choices[0].message.content)
    return data.get("questions", [])


# ---------------------------------------------------------------------------
# Stage B: 정답 풀이 + 정답기반 76분류  (상위 모델, 어법 문항만)
# ---------------------------------------------------------------------------

_STAGE_B_SCHEMA = {
    "name": "solve_classify",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "answer": {"type": "string"},
            "answer_confidence": {"type": "number"},
            "grammar_category": {"type": "string"},
            "alt": {"type": "array", "items": {"type": "string"}},
            "question_type": {"type": "string", "enum": ["문장형", "지문형", "서술형"]},
            "reason": {"type": "string"},
            "classification_confidence": {"type": "number"},
        },
        "required": [
            "answer", "answer_confidence", "grammar_category", "alt",
            "question_type", "reason", "classification_confidence",
        ],
    },
}


def _categories_prompt_block():
    items = summit_ingest.categories_payload().get("subItems", [])
    return "\n".join(f"- {it['subId']}: {it['label']}" for it in items)


_STAGE_B_SYSTEM = """너는 한국 영어 어법 문제를 푸는 전문가이자 분류 담당이다.
주어진 문항을 직접 풀어 정답을 정하고, 그 '정답 선지가 나타내는 문법' 기준으로 아래 소항목 중 하나로 분류한다.

분류 핵심 원칙:
- 분류 기준은 오직 '정답'이 묻는 문법 개념이다. 해설이나 오답 선지에 등장하는 문법은 무시한다.
- 어법 오류 찾기형이면 '정답(=틀린 선지)이 위반하는 규칙'이 분류 기준이다.
- '어법상 옳은 것의 개수' 같은 개수형/혼합형이라 정답이 단일 문법을 나타내지 않거나, 적절한 칸이 없으면 '99-1'(미분류)로 하고 classification_confidence 를 낮춰라.

출력:
- answer: 정답(보기 번호 '①'~'⑤' 또는 서술형 정답 텍스트).
- answer_confidence / classification_confidence: 0.0~1.0.
- grammar_category: 아래 목록의 subId 중 하나(예 '2-7').
- alt: 차선 후보 subId 배열(없으면 []).
- reason: 정답 근거 + 분류 근거 1~2문장.

[문법 소항목 목록]
""" + _categories_prompt_block() + "\n오직 지정된 JSON 스키마로만 답한다."


def stage_b_solve(question_obj, model=None):
    """어법 문항 1건 → 정답+분류. 상위 모델 1콜."""
    model = model or MODEL_SOLVE
    q = question_obj
    user = json.dumps({
        "question": q.get("question", ""),
        "passage": q.get("passage", ""),
        "options": q.get("options", []),
    }, ensure_ascii=False)
    resp = client().chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": _STAGE_B_SYSTEM},
            {"role": "user", "content": user},
        ],
        response_format={"type": "json_schema", "json_schema": _STAGE_B_SCHEMA},
    )
    return json.loads(resp.choices[0].message.content)


# ---------------------------------------------------------------------------
# 오케스트레이션
# ---------------------------------------------------------------------------

# 작은 원문자 마커(ⓐⓑⓒ…)가 nano OCR 에서 깨질 때의 대표 오인식 → 소문자 매핑
_GLYPH_TO_MARKER = {
    "ⓐ": "a", "ⓑ": "b", "ⓒ": "c", "ⓓ": "d", "ⓔ": "e", "ⓕ": "f",
    "©": "c",  # ⓒ 가 저작권 기호로 오인식되는 사례
}
_MARKER_TO_CIRCLED = {chr(ord("a") + i): chr(0x24D0 + i) for i in range(6)}  # a→ⓐ … f→ⓕ
_CIRCLED_NUM = "①②③④⑤⑥⑦⑧⑨⑩"
# 보기 조합 본문에 허용되는 문자(마커/구분기호/공백)만으로 구성됐는지 판별
_COMBO_BODY_RE = re.compile(r"^[a-fA-Fⓐ-ⓥ©@()\[\].,·•\s/&\-]+$")


def _normalize_marker_combo(option):
    """'① a@f' 같은 '모두 고른 것/짝지은 것' 조합 보기에서 깨진 원문자 마커를 ⓐⓑⓒ 로 복원.
    본문이 마커/구분기호로만 구성된 옵션에만 적용하므로 일반 문장 보기는 건드리지 않는다."""
    s = (option or "").strip()
    prefix = ""
    if s and s[0] in _CIRCLED_NUM:
        prefix, s = s[0], s[1:].strip()
    if not s or not _COMBO_BODY_RE.match(s):
        return option  # 마커 조합형이 아님 → 원본 유지
    letters = []
    for ch in s:
        m = _GLYPH_TO_MARKER.get(ch, ch.lower())
        if m in _MARKER_TO_CIRCLED and m not in letters:
            letters.append(m)
    if len(letters) < 2:
        return option  # 마커 2개 미만이면 확신 못 함 → 원본 유지
    body = "".join(_MARKER_TO_CIRCLED[m] for m in letters)
    return f"{prefix} {body}" if prefix else body


def _make_flags(stage_a_q, stage_b):
    flags = []
    if not stage_a_q.get("answer_marked"):
        flags.append("정답 AI 추론 — 확인 필요")
    if stage_b:
        if stage_b.get("answer_confidence", 0) < 0.7:
            flags.append("정답 신뢰도 낮음")
        if stage_b.get("classification_confidence", 0) < 0.7:
            flags.append("분류 신뢰도 낮음")
        if stage_b.get("grammar_category") == "99-1":
            flags.append("미분류(99-1)")
    return flags


def _process_page_questions(qs, page_num, grade, seq, drafts):
    """Stage A 산출 문항 → draft 적재. 비문법은 버리지 않고 out_of_scope 로 보존
    (검토에서 '제외됨' 목록으로 노출 + 어법 승격 가능). (새 seq, skipped) 반환."""
    skipped = 0
    for q in qs:
        is_grammar = bool(q.get("is_grammar"))
        stage_b = None
        if is_grammar:
            try:
                stage_b = stage_b_solve(q)  # 정답풀이+분류는 어법 문항에만
            except Exception as e:  # noqa: BLE001
                print(f"  [Stage B] error: {e}")
        else:
            skipped += 1
        extracted = {
            "question": q.get("question", ""),
            "passage": q.get("passage", ""),
            "options": [_normalize_marker_combo(o) for o in q.get("options", [])],
            "answer": (stage_b or {}).get("answer") or q.get("answer_marked", ""),
            "explanation": (stage_b or {}).get("reason", ""),
            "question_type": (stage_b or {}).get("question_type") or q.get("type_guess", "문장형"),
            "grammar_category": (stage_b or {}).get("grammar_category", "99-1"),
        }
        drafts.append({
            "draft_id": f"draft-{grade}-{seq:04d}",
            "status": "needs_review" if is_grammar else "out_of_scope",
            "is_grammar": is_grammar,
            "page": page_num,
            "source_number": q.get("number", ""),
            "extracted": extracted,
            "confidence": {
                "answer": (stage_b or {}).get("answer_confidence", 0.0),
                "classification": (stage_b or {}).get("classification_confidence", 0.0),
            } if is_grammar else {},
            "ai_candidates": {"grammar_category": (stage_b or {}).get("alt", [])} if is_grammar else {},
            "flags": _make_flags(q, stage_b) if is_grammar else ["비문법 — 자동 제외(필요시 어법으로 승격)"],
        })
        seq += 1
    return seq, skipped


def run_pipeline(pdf_path, grade, dpi=300, split_columns=True, page_limit=None,
                 verbose=False):
    """PDF → drafts. 스캔본=Vision OCR, 디지털=텍스트 — 둘 다 동일하게 문항분해+분류."""
    pre = summit_pdf.preprocess(pdf_path, dpi=dpi, split_columns=split_columns)

    drafts = []
    skipped = 0
    seq = 1

    if pre["mode"] == "ocr":
        pages = _group_by_page(pre["pages"])
        if page_limit:
            pages = pages[:page_limit]
        for chunks in pages:
            page_num = chunks[0]["page"] + 1
            if verbose:
                print(f"  [Stage A/vision] page {page_num} ...")
            try:
                qs = stage_a_page(chunks)
            except Exception as e:  # noqa: BLE001
                print(f"  [Stage A] page error: {e}")
                qs = []
            seq, sk = _process_page_questions(qs, page_num, grade, seq, drafts)
            skipped += sk
    else:
        pages = pre["pages"]
        if page_limit:
            pages = pages[:page_limit]
        for p in pages:
            page_num = p["page"] + 1
            if verbose:
                print(f"  [Stage A/text] page {page_num} ...")
            try:
                qs = stage_a_text(p["text"])
            except Exception as e:  # noqa: BLE001
                print(f"  [Stage A] text error: {e}")
                qs = []
            seq, sk = _process_page_questions(qs, page_num, grade, seq, drafts)
            skipped += sk

    return {
        "meta": {"mode": pre["mode"], "page_count": pre["page_count"],
                 "is_scanned": pre["is_scanned"], "grade": grade,
                 "model_ocr": MODEL_OCR, "model_solve": MODEL_SOLVE},
        "drafts": drafts,
        "skipped_non_grammar": skipped,
    }
