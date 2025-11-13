import random
from typing import final
from docx import Document
from docxtpl import DocxTemplate
import re

def _norm(text: str) -> str:
    t = (text or "").strip().lower()
    # 영문/숫자/한글만 남겨 비교를 유연하게
    return re.sub(r"[^a-z0-9가-힣]", "", t)

def _looks_like_number(s: str) -> bool:
    return bool(re.match(r"^\s*\d+", (s or "").strip()))

def _is_korean_text(s: str) -> bool:
    # 한글 비율이 일정 이상이면 한국어로 판단
    text = (s or "")
    hangul = sum(1 for ch in text if "가" <= ch <= "힣")
    letters = sum(1 for ch in text if ch.isalpha())
    return hangul > 0 and (hangul / max(letters, 1)) >= 0.3

def parse_words_from_docx(doc_path):
    """
    워드 파일 경로를 받아 다양한 표 형식(3/4/5열)을 읽고,
    레슨별 (단어, 한국어 해석) 목록을 반환합니다.
    """
    try:
        doc = Document(doc_path)
        lessons = {}
        current_lesson = 0

        # 현재 표 구간에서 추출한 헤더 기반 인덱스
        word_idx = None
        trans_idx = None

        for table in doc.tables:
            # 표가 바뀌면 헤더 인덱스 초기화 (새 표의 헤더를 다시 탐색)
            word_idx = None
            trans_idx = None

            for row in table.rows:
                cells = [cell.text.strip() for cell in row.cells]
                if not cells:
                    continue

                # 1) 헤더 감지
                if len(cells) > 1:
                    c0 = _norm(cells[0])
                    c1 = _norm(cells[1])
                    if c0 in {"no", "number", "번호"} and c1 in {"word", "words", "단어"}:
                        current_lesson += 1
                        lessons[current_lesson] = []
                        # 기본 열 가정
                        word_idx = 1
                        trans_idx = None
                        # 번역/뜻/의미/해석 열 위치 탐색
                        header_norms = [_norm(c) for c in cells]
                        for j, h in enumerate(header_norms):
                            if h in {"translation", "해석", "뜻", "의미"}:
                                trans_idx = j
                                break
                        if trans_idx is None:
                            # Translation 헤더가 없으면 Meaning 사용
                            for j, h in enumerate(header_norms):
                                if h == "meaning":
                                    trans_idx = j
                                    break
                        continue

                # 2) 헤더가 없지만 숫자 행이 먼저 나오는 경우 레슨 시작
                if current_lesson == 0 and len(cells) >= 2 and _looks_like_number(cells[0]):
                    current_lesson = 1
                    lessons[current_lesson] = []
                    # 열 인덱스 추정
                    word_idx = 1
                    trans_idx = None  # 아래에서 행 단위로 보정

                # 3) 데이터 행 처리
                if current_lesson > 0 and len(cells) >= 2 and _looks_like_number(cells[0]):
                    # 단어 인덱스 확정
                    wi = word_idx if word_idx is not None and word_idx < len(cells) else 1

                    # 번역 인덱스 결정 로직
                    ti = trans_idx if (trans_idx is not None and trans_idx < len(cells)) else None
                    if ti is None:
                        # 열 개수로 1차 추정
                        if len(cells) >= 5:
                            ti = 4
                        elif len(cells) >= 4:
                            ti = 3
                        elif len(cells) >= 3:
                            ti = 2
                        else:
                            ti = len(cells) - 1

                    translation = cells[ti]
                    # 번역 셀이 한국어가 아닐 가능성에 대비, 한국어가 있는 첫 셀로 보정
                    if not _is_korean_text(translation):
                        for j in range(2, len(cells)):
                            if _is_korean_text(cells[j]):
                                translation = cells[j]
                                ti = j
                                break

                    word = cells[wi]
                    if word:
                        lessons[current_lesson].append((word, translation))
        return lessons
    except Exception as e:
        print(f"Error parsing docx: {e}")
        return None

def generate_tests_with_docxtpl(all_words_by_lesson, template_path, output_path):
    """
    docxtpl 라이브러리를 사용하여 모든 누적 시험지와 정답지를 생성합니다.
    (수정: 레슨당 3페이지 - 문제지, 영어답지, 한글답지)
    (수정: 템플릿 조건부 렌더링을 사용하여 빈 표 숨기기)
    """
    try:
        doc = DocxTemplate(template_path)
        total_lessons = len(all_words_by_lesson)
        lessons_context = []

        for i in range(1, total_lessons + 1):
            # 1. 단어 선택 로직
            current_lesson_pairs = all_words_by_lesson.get(i, [])
            pairs_for_test = []
            if len(current_lesson_pairs) >= 50:
                # 원본 보존: 제자리 섞기 대신 샘플링
                pairs_for_test = random.sample(current_lesson_pairs, 50)
            else:
                pairs_for_test.extend(current_lesson_pairs)
                previous_pairs = []
                for j in range(1, i):
                    previous_pairs.extend(all_words_by_lesson.get(j, []))
                num_needed = 50 - len(current_lesson_pairs)
                if num_needed > 0 and previous_pairs:
                    random.shuffle(previous_pairs)
                    pairs_for_test.extend(previous_pairs[:num_needed])
            
            # 2. 문제지 생성
            problem_pairs = pairs_for_test.copy()
            random.shuffle(problem_pairs)
            
            final_english_words = [pair[0] for pair in problem_pairs]
            # 문제지 한글 표는 영어와 별도로 섞음
            final_korean_translations = [pair[1] for pair in problem_pairs]
            random.shuffle(final_korean_translations)
            
            # 50행 패딩
            final_english_words += [""] * (50 - len(final_english_words))
            final_korean_translations += [""] * (50 - len(final_korean_translations))
            
            # [PAGE 1] 문제지 페이지 (영어) (영어만 보여줌)
            blank_table = [""] * 50  # 이 줄을 [PAGE 2] 이전에 미리 정의해두면 좋습니다.
                                     # (이미 127줄 근처에 있다면 이 줄은 생략)
            
            lessons_context.append({
                'lesson_number': i,
                'words': final_english_words,       # 문제지 영어 단어
                'translations': blank_table,        # 한글 (빈) 데이터
                'show_words': True,                 # 영어 섹션: 보임
                'show_translations': False          # 한글 섹션: 숨김
            })

            # [PAGE 2] 문제지 페이지 (한글) (한글만 보여줌)
            lessons_context.append({
                'lesson_number': i,
                'words': blank_table,               # 영어 (빈) 데이터
                'translations': final_korean_translations, # 문제지 한글 뜻
                'show_words': False,                # 영어 섹션: 숨김
                'show_translations': True           # 한글 섹션: 보임
            })
            
            # 3. 답지 생성
            answer_english_words = []
            for eng, kor in problem_pairs:
                answer_english_words.append(f"{eng} {kor}")

            #    동일 번역(중복) 대비 위해 리스트 매핑 사용
            kor_to_engs = {}
            for eng, kor in pairs_for_test: # 매핑 테이블은 섞기 전 원본(pairs_for_test) 사용
                kor_to_engs.setdefault(kor, []).append(eng)

            answer_korean_translations = []
            for kor in final_korean_translations[:50]:  # 패딩 전 실제 항목(문제지 한글표 순서)만 처리
                if kor == "":
                    answer_korean_translations.append("")
                else:
                    eng_list = kor_to_engs.get(kor, [])
                    eng = eng_list.pop(0) if eng_list else ""
                    answer_korean_translations.append(f"{kor} {eng}")

            # 답지용 50행 패딩
            answer_english_words += [""] * (50 - len(answer_english_words))
            answer_korean_translations += [""] * (50 - len(answer_korean_translations))
            
            # 빈 테이블 데이터 생성 (템플릿이 데이터를 참조할 때 오류가 나지 않도록)
            # (show_words: False일 때 'words'를, show_translations: False일 때 'translations'를 참조하므로)
            blank_table = [""] * 50

            # [PAGE 2] 답지 페이지 (영어) (영어만 보여줌)
            lessons_context.append({
                'lesson_number': i,
                'words': answer_english_words,      # 영어 답안지 데이터
                'translations': blank_table,        # 한글 (빈) 데이터
                'show_words': True,                 # 영어 섹션: 보임
                'show_translations': False          # 한글 섹션: 숨김
            })

            # [PAGE 3] 답지 페이지 (한글) (한글만 보여줌)
            lessons_context.append({
                'lesson_number': i,
                'words': blank_table,               # 영어 (빈) 데이터
                'translations': answer_korean_translations, # 한글 답안지 데이터
                'show_words': False,                # 영어 섹션: 숨김
                'show_translations': True           # 한글 섹션: 보임
            })

        # 4. 렌더링
        context = {'lessons': lessons_context}
        doc.render(context)
        doc.save(output_path)
        return True
    except Exception as e:
        print(f"Error generating docx: {e}")
        return False