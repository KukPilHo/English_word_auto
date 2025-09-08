import random
from docx import Document
from docxtpl import DocxTemplate

def parse_words_from_docx(doc_path):
    """
    워드 파일 경로를 받아 4열 또는 5열 형식의 표를 모두 읽고, 
    레슨별로 (단어, 해석) 쌍의 목록을 딕셔너리로 반환합니다.
    """
    try:
        doc = Document(doc_path)
        lessons = {}
        current_lesson = 0
        
        for table in doc.tables:
            for row in table.rows:
                cells = [cell.text.strip() for cell in row.cells]
                # 표의 헤더('No', 'Words')로 새로운 레슨 시작을 감지
                if len(cells) > 1 and cells[0] == 'No' and cells[1] == 'Words':
                    current_lesson += 1
                    lessons[current_lesson] = []
                    continue
                
                # 데이터 줄(숫자로 시작) 처리
                # ⭐️⭐️⭐️ 핵심 수정사항: 4열 이상인지 확인하도록 변경 ⭐️⭐️⭐️
                if current_lesson > 0 and len(cells) >= 4 and cells[0].isdigit():
                    word = cells[1]
                    translation = ""

                    # ⭐️ 열 개수에 따라 해석 위치를 다르게 지정 ⭐️
                    if len(cells) >= 5:
                        # 5열 형식 (기존 파일)
                        translation = cells[4]
                    else: # len(cells) == 4
                        # 4열 형식 (새 파일)
                        translation = cells[3]

                    if word:
                        lessons[current_lesson].append((word, translation))
        return lessons
    except Exception as e:
        print(f"Error parsing docx: {e}")
        return None

def generate_tests_with_docxtpl(all_words_by_lesson, template_path, output_path):
    """
    docxtpl 라이브러리를 사용하여 모든 누적 시험지와 정답지를 생성합니다.
    (이 함수는 수정할 필요가 없습니다.)
    """
    try:
        doc = DocxTemplate(template_path)
        total_lessons = len(all_words_by_lesson)
        lessons_context = []

        for i in range(1, total_lessons + 1):
            # 새로운 단어 선택 로직
            current_lesson_pairs = all_words_by_lesson.get(i, [])
            pairs_for_test = []
            if len(current_lesson_pairs) >= 50:
                random.shuffle(current_lesson_pairs)
                pairs_for_test = current_lesson_pairs[:50]
            else:
                pairs_for_test.extend(current_lesson_pairs)
                previous_pairs = []
                for j in range(1, i):
                    previous_pairs.extend(all_words_by_lesson.get(j, []))
                num_needed = 50 - len(current_lesson_pairs)
                if num_needed > 0 and previous_pairs:
                    random.shuffle(previous_pairs)
                    pairs_for_test.extend(previous_pairs[:num_needed])
            
            random.shuffle(pairs_for_test)

            final_english_words = [pair[0] for pair in pairs_for_test]
            final_korean_translations = [pair[1] for pair in pairs_for_test]

            final_english_words += [""] * (50 - len(final_english_words))
            final_korean_translations += [""] * (50 - len(final_korean_translations))
            
            lessons_context.append({
                'words': final_english_words,
                'translations': final_korean_translations
            })

        context = {'lessons': lessons_context}
        doc.render(context)
        doc.save(output_path)
        return True
    except Exception as e:
        print(f"Error generating docx: {e}")
        return False