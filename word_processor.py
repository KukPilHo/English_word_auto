import random
import os
from docx import Document
from docxtpl import DocxTemplate

def read_text_from_docx(filename):
    """
    .docx 파일에서 표(table)의 모든 텍스트를 읽어옵니다.
    """
    try:
        doc = Document(filename)
        full_text = []
        for table in doc.tables:
            for row in table.rows:
                row_text = ",".join(cell.text for cell in row.cells)
                full_text.append(row_text)
        return '\n'.join(full_text)
    except Exception as e:
        print(f"❌ 오류: '{filename}' 파일을 읽는 중 문제가 발생했습니다. ({e})")
        return None

def parse_words_from_text(source_text):
    """
    'No,Words,'를 기준으로 레슨을 나누어 (단어, 해석) 쌍의 목록을 딕셔너리로 반환합니다.
    """
    lessons = {}
    current_lesson = 0
    lines = source_text.split('\n')
    for line in lines:
        content = line.strip()
        if not content:
            continue
        if content.startswith('No,Words,'):
            current_lesson += 1
            lessons[current_lesson] = []
            continue
        if current_lesson > 0 and content and content[0].isdigit():
            parts = content.split(',')
            # 단어는 두 번째 열(index 1), 해석은 다섯 번째 열(index 4)에 있음
            if len(parts) > 4:
                word = parts[1].strip()
                translation = parts[4].strip().strip('"') # 가끔 포함되는 큰따옴표 제거
                if word:
                    lessons[current_lesson].append((word, translation)) # (단어, 해석) 튜플로 저장
    return lessons

def generate_tests_with_docxtpl(all_words_by_lesson, template_file, output_filename):
    """
    docxtpl 라이브러리를 사용하여 단어 시험지와 정답지를 함께 생성합니다.
    """
    try:
        doc = DocxTemplate(template_file)
    except Exception as e:
        print(f"❌ 오류: 템플릿 파일('{template_file}')을 열 수 없습니다. ({e})")
        return

    total_lessons = len(all_words_by_lesson)
    lessons_context = []

    for i in range(1, total_lessons + 1):
        # 단어 선택 로직 (이제 (단어, 해석) 쌍으로 처리)
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
        
        # 최종 목록 섞기
        random.shuffle(pairs_for_test)

        # 템플릿에 전달하기 위해 영어 목록과 한글 목록으로 분리
        final_english_words = [pair[0] for pair in pairs_for_test]
        final_korean_translations = [pair[1] for pair in pairs_for_test]

        # 50개로 길이 맞추기
        final_english_words += [""] * (50 - len(final_english_words))
        final_korean_translations += [""] * (50 - len(final_korean_translations))
        
        lessons_context.append({
            'words': final_english_words,
            'translations': final_korean_translations
        })

    # 최종 렌더링
    context = {
        'lessons': lessons_context
    }
    doc.render(context)
    doc.save(output_filename)
    print(f"✅ '{output_filename}' 파일이 성공적으로 생성되었습니다.")
    print(f"   (총 {total_lessons}개의 누적 시험지와 정답지가 포함되어 있습니다.)")


def create_word_test(input_file_path, template_file_path, output_file_path):
    """
    입력받은 docx 파일과 템플릿을 사용하여 단어 시험지 파일을 생성합니다.
    성공 시 True, 실패 시 False를 반환합니다.
    """
    source_text = read_text_from_docx(input_file_path)
    if source_text is None:
        print("파일을 읽지 못해 프로그램을 종료합니다.")
        return False
    
    all_parsed_words = parse_words_from_text(source_text)
    if not all_parsed_words:
        print("⚠️ 파일에서 단어 목록을 찾지 못했습니다.")
        return False
        
    generate_tests_with_docxtpl(
        all_parsed_words,
        template_file_path,
        output_file_path
    )
    print(f"✅ '{output_file_path}' 파일이 성공적으로 생성되었습니다.")
    return True