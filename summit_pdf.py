"""
Summit AI - PDF 전처리 모듈.

책임:
  - 텍스트 레이어 유무 자동 판별 (디지털 vs 스캔)
  - 페이지를 이미지(PNG base64)로 렌더링 (스캔/Vision OCR 경로)
  - 2단 레이아웃 좌/우 컬럼 분리(선택) — 읽기순서 꼬임 완화
  - 디지털 PDF면 페이지 텍스트 추출

추출 LLM 호출은 여기서 하지 않는다(summit_extract.py 담당).
"""

import base64
import fitz  # PyMuPDF


# 페이지당 텍스트 글자수가 이 값 미만이면 스캔으로 간주
_TEXT_LAYER_MIN_CHARS = 20


def _pixmap_to_b64(pix, fmt="png"):
    img_bytes = pix.tobytes(fmt)
    b64 = base64.b64encode(img_bytes).decode("ascii")
    return f"data:image/{fmt};base64,{b64}"


def analyze_pdf(path):
    """PDF 메타 분석. (is_scanned, page_count, per_page_text_len) 반환."""
    doc = fitz.open(path)
    lens = [len(doc[i].get_text().strip()) for i in range(doc.page_count)]
    page_count = doc.page_count
    doc.close()
    total = sum(lens)
    is_scanned = total < _TEXT_LAYER_MIN_CHARS * max(1, page_count)
    return {
        "is_scanned": is_scanned,
        "page_count": page_count,
        "per_page_text_len": lens,
    }


def render_pages(path, dpi=220, split_columns=False, pages=None):
    """각 페이지를 이미지(base64 data URL)로 렌더링.

    split_columns=True 이면 페이지를 좌/우 절반으로 잘라 2개 이미지로 반환
    (2단 레이아웃 읽기순서 완화). pages: 0-based 인덱스 리스트(None이면 전체).
    반환: [{"page": i, "col": 'full'|'L'|'R', "image": dataurl}]
    """
    doc = fitz.open(path)
    out = []
    idxs = pages if pages is not None else range(doc.page_count)
    zoom = dpi / 72.0
    for i in idxs:
        page = doc[i]
        if not split_columns:
            pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
            out.append({"page": i, "col": "full", "image": _pixmap_to_b64(pix)})
        else:
            rect = page.rect
            mid = rect.x0 + rect.width / 2.0
            left = fitz.Rect(rect.x0, rect.y0, mid, rect.y1)
            right = fitz.Rect(mid, rect.y0, rect.x1, rect.y1)
            for col, clip in (("L", left), ("R", right)):
                pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), clip=clip)
                out.append({"page": i, "col": col, "image": _pixmap_to_b64(pix)})
    doc.close()
    return out


def extract_text(path, pages=None):
    """디지털 PDF 텍스트 레이어 추출. 반환: [{"page": i, "text": str}]"""
    doc = fitz.open(path)
    out = []
    idxs = pages if pages is not None else range(doc.page_count)
    for i in idxs:
        out.append({"page": i, "text": doc[i].get_text()})
    doc.close()
    return out


def preprocess(path, dpi=220, split_columns=True):
    """업로드 직후 1콜 전처리. 스캔이면 이미지, 디지털이면 텍스트 페이로드 반환.

    반환: {
      "is_scanned": bool, "page_count": int, "mode": "ocr"|"text",
      "pages": [...]  # mode=ocr → render_pages 결과, mode=text → extract_text 결과
    }
    """
    meta = analyze_pdf(path)
    if meta["is_scanned"]:
        pages = render_pages(path, dpi=dpi, split_columns=split_columns)
        mode = "ocr"
    else:
        pages = extract_text(path)
        mode = "text"
    return {
        "is_scanned": meta["is_scanned"],
        "page_count": meta["page_count"],
        "mode": mode,
        "pages": pages,
    }
