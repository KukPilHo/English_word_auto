from flask import Flask, request, jsonify, send_file, render_template, abort, send_from_directory
from werkzeug.utils import secure_filename
from flask_cors import CORS
import os
import uuid
import glob
import json
import word_processor

app = Flask(__name__, static_folder='frontend/dist', static_url_path='')
CORS(app)

UPLOAD_FOLDER = 'uploads'
GENERATED_FOLDER = 'generated'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(GENERATED_FOLDER, exist_ok=True)

QUESTIONS_DB = []

def match_category(grade, question_type, question_text, passage_text, explanation_text):
    # grade: "고1", "고2", "고3", "중1", "중2", "중3"
    # question_type: "[어법]", "[어휘]", "[대의 파악]", "[빈칸]" 등
    grade = grade or "고1"
    question_type = question_type or ""
    
    # 1. 고등/중등 분류
    is_high = "고" in grade
    
    grade_num = "1"
    if "2" in grade:
        grade_num = "2"
    elif "3" in grade:
        grade_num = "3"
        
    prefix = "high" if is_high else "middle"
    domain = f"{prefix}-{grade_num}"
    
    full_text = f"{question_text} {passage_text or ''} {explanation_text or ''}"
    
    # 공통 키워드 (중1, 중2, 중3 및 고등 공용)
    keywords = {
        "1-1": ["be동사", "be 동사", "am, are, is", "am/are/is"],
        "1-2": ["일반동사", "일반 동사"],
        "1-3": ["there is", "there are", "there 구문"],
        "1-4": ["의문사"],
        "1-5": ["간접의문문", "간접 의문문"],
        "1-6": ["부가의문문", "부정의문문"],
        "1-7": ["명령문"],
        "1-8": ["감탄문"],
        "1-9": ["청유형", "let's"],
        "2-1": ["1형식", "3형식"],
        "2-2": ["2형식"],
        "2-3": ["4형식"],
        "2-4": ["5형식", "목적격 보어", "목적격보어"],
        "2-5": ["to부정사 보어"],
        "2-6": ["사역동사"],
        "2-8": ["과거분사 보어"],
        "3-1": ["can", "be able to"],
        "3-2": ["will", "would"],
        "3-3": ["may", "might"],
        "3-4": ["must", "have to"],
        "3-5": ["should", "ought to"],
        "4-1": ["진행 시제", "현재진행", "과거진행"],
        "4-2": ["미래 시제", "미래시제"],
        "4-3": ["현재완료", "have p.p", "has p.p", "have + p.p", "has + p.p"],
        "5-1": ["수동태", "be p.p", "be + p.p"],
        "5-2": ["4형식 수동태", "5형식 수동태"],
        "5-3": ["주의해야 할 수동태"],
        "6-1": ["수량 형용사"],
        "6-3": ["형용사와 부사"],
        "7-1": ["빈도부사"],
        "7-2": ["부사 수식"],
        "7-3": ["이어동사"],
        "8-1": ["셀 수 있는 명사", "셀 수 없는 명사", "가산명사", "불가산명사"],
        "8-3": ["명사 수 일치", "소유격", "복수형"],
        "8-4": ["부분 표현"],
        "8-5": ["인칭대명사", "지시대명사"],
        "8-6": ["비인칭 주어", "비인칭 it"],
        "8-7": ["재귀대명사"],
        "8-8": ["부정대명사", "another", "the other"],
        "8-9": ["each", "every"],
        "9-1": ["to부정사", "to 부정사", "to-infinitive", "명사적 용법"],
        "9-2": ["형용사적 용법"],
        "9-3": ["부사적 용법"],
        "9-4": ["가주어", "가목적어"],
        "9-6": ["too ~ to", "enough to"],
        "10-1": ["동명사", "gerund"],
        "10-2": ["동명사를 목적어"],
        "10-3": ["동명사 관용"],
        "11-1": ["현재분사", "과거분사", "분사 수식", "participle"],
        "11-2": ["감정 분사", "감정을 나타내는"],
        "11-4": ["with + 명사 + 분사"],
        "13-1": ["등위접속사", "conjunction"],
        "13-2": ["상관접속사", "both and", "either or", "neither nor"],
        "13-3": ["명사절 접속사", "that절"],
        "13-4": ["whether"],
        "13-5": ["시간 부사절"],
        "13-6": ["이유 부사절", "because", "since"],
        "13-8": ["목적 부사절", "결과 부사절", "so that"],
        "13-9": ["전치사 vs 접속사"],
        "13-10": ["as의 쓰임"],
        "14-1": ["원급 비교", "as ~ as"],
        "14-2": ["비교급"],
        "14-3": ["최상급"],
        "16-3": ["동격"],
        "16-4": ["병렬 구조", "병렬구조"],
        "16-5": ["수 일치", "시제 일치"],
        "16-6": ["화법 전환", "대동사"],
    }
    
    # 상세/추가 키워드
    keywords_detail = {
        "2-7": ["지각동사"],
        "3-6": ["강조의 do"],
        "3-7": ["조동사 + have p.p", "조동사 + have"],
        "3-8": ["기타 조동사"],
        "4-4": ["과거완료", "미래완료"],
        "4-5": ["완료 진행형"],
        "6-2": ["한정적 용법", "서술적 용법", "형용사의 쓰임"],
        "8-2": ["부정관사", "정관사", "관사"],
        "9-5": ["의미상 주어"],
        "11-3": ["분사구문"],
        "12-1": ["주격 관계대명사"],
        "12-2": ["목적격 관계대명사"],
        "12-3": ["소유격 관계대명사"],
        "12-4": ["관계대명사 what"],
        "12-5": ["계속적 용법"],
        "12-6": ["관계부사"],
        "12-7": ["복합관계사"],
        "13-7": ["양보 부사절", "although", "though"],
        "14-4": ["배수사", "비교 관용"],
        "15-1": ["가정법 과거", "가정법 과거완료", "가정법"],
        "15-3": ["당위성 동사", "should 생략"],
        "16-1": ["It ~ that 강조", "강조 구문"],
        "16-2": ["도치 구문", "도치"],
    }
    
    # 1. 상세 키워드 먼저 검사
    for ch, kws in keywords_detail.items():
        if any(kw in full_text for kw in kws):
            return f"{domain}-grammar-{ch}"
            
    # 2. 공통 키워드 검사
    for ch, kws in keywords.items():
        if any(kw in full_text for kw in kws):
            return f"{domain}-grammar-{ch}"
            
    return f"{domain}-grammar-99-1"

def load_questions_db():
    global QUESTIONS_DB
    questions_list = []
    
    # 여러 검색 경로 설정 (Desktop, workspace DB, new_json 등 통합)
    paths_to_search = [
        os.path.join(os.path.dirname(__file__), 'DB', '*.json'),
        os.path.join(os.path.dirname(__file__), 'new_json', '*.json'),
        '/Users/pilho_kuk/Documents/English_word_auto_v.2.0/new_json/*.json'
    ]
    
    files = []
    for p in paths_to_search:
        files.extend(glob.glob(p))
        
    # 중복 제거 (절대 경로 기준)
    files = list(set(os.path.abspath(f) for f in files))
    
    print(f"[DB Loader] Searching JSON files...")
    print(f"[DB Loader] Found files: {files}")
    
    for file_path in files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
                raw_items = []
                if isinstance(data, dict) and "questions" in data:
                    raw_items = data["questions"]
                elif isinstance(data, list):
                    raw_items = data
                
                for idx, item in enumerate(raw_items):
                    question_text = item.get("question", "")
                    if not question_text:
                        continue
                    
                    # 문법 분류 체크 (독해, 교과서, 모의고사 배제)
                    is_grammar = False
                    if item.get("main_category") == "문법":
                        is_grammar = True
                    
                    g_cats = item.get("grammar_categories")
                    if g_cats and isinstance(g_cats, list) and len(g_cats) > 0:
                        is_grammar = True
                        
                    q_type = item.get("question_type", "")
                    if q_type and any(x in q_type for x in ["어법", "문법", "Grammar"]):
                        is_grammar = True
                        
                    if not is_grammar:
                        continue  # 문법이 아닌 문항은 스킵
                    
                    grade = item.get("grade", "고1")
                    passage = item.get("passage", "")
                    explanation = item.get("explanation", "")
                    
                    # 상세 문법 카테고리 ID 도출
                    ch_code = None
                    if g_cats and isinstance(g_cats, list) and len(g_cats) > 0:
                        ch_code = g_cats[0]
                        
                    if "중" in grade or "middle" in grade.lower():
                        prefix = "middle"
                    else:
                        prefix = "high"
                        
                    grade_num = "1"
                    if "2" in grade:
                        grade_num = "2"
                    elif "3" in grade:
                        grade_num = "3"
                        
                    domain = f"{prefix}-{grade_num}"
                    
                    if ch_code:
                        category_id = f"{domain}-grammar-{ch_code}"
                    else:
                        category_id = match_category(grade, q_type, question_text, passage, explanation)
                        
                    # sub_type 매핑 정밀화
                    if "서술" in q_type or "주관식" in q_type:
                        sub_type = "서술형"
                    elif "지문" in q_type:
                        sub_type = "지문형"
                    elif "일반" in q_type:
                        sub_type = "일반형"
                    elif "문장" in q_type:
                        sub_type = "문장형"
                    else:
                        sub_type = "문장형"  # 기본값
                    
                    options = item.get("options", [])
                    difficulty = item.get("estimated_difficulty", "중")
                    if not difficulty or difficulty == "None" or difficulty == "null":
                        difficulty = "중"
                    
                    school_name = item.get("school_name", "")
                    year = item.get("year", "")
                    source_file = item.get("source_file", "")
                    
                    source = f"{year} {grade} {school_name}".strip()
                    if not source:
                        source = source_file.replace(".txt", "").replace("(개정)", "").strip()
                        
                    source_idx = item.get("source_index", "")
                    q_id = f"gq-db-{os.path.basename(file_path)}-{idx}"
                    
                    questions_list.append({
                        "id": q_id,
                        "categoryId": category_id,
                        "subType": sub_type,
                        "question": question_text,
                        "passage": passage,
                        "options": options,
                        "answer": item.get("answer", ""),
                        "explanation": explanation,
                        "difficulty": difficulty,
                        "source": source,
                        "sourceIndex": source_idx,
                        "grade": grade,
                        "tags": item.get("vocabulary_box", []) or []
                    })
        except Exception as e:
            print(f"[DB Loader] Error loading {file_path}: {e}")
            
    QUESTIONS_DB = questions_list
    print(f"[DB Loader] Loaded {len(QUESTIONS_DB)} grammar questions successfully.")

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/questions', methods=['GET'])
def get_questions():
    category_ids = request.args.getlist('categories')
    if not category_ids:
        cats = request.args.get('categories', '')
        if cats:
            category_ids = cats.split(',')
            
    filtered = QUESTIONS_DB
    
    if category_ids:
        target_cats = []
        target_subtypes = {}
        for cid in category_ids:
            if "__" in cid:
                base, st = cid.split("__", 1)
                target_cats.append(base)
                target_subtypes[base] = st
            else:
                target_cats.append(cid)
                
        def match_cat(q):
            for tc in target_cats:
                if q["categoryId"].startswith(tc):
                    if tc in target_subtypes:
                        return q["subType"] == target_subtypes[tc]
                    return True
            return False
            
        filtered = [q for q in filtered if match_cat(q)]
        
    return jsonify(filtered)

@app.route('/generate', methods=['POST'])
def generate_workbook():
    if 'wordFile' not in request.files:
        return jsonify({'error': '단어 목록 파일이 누락되었습니다.'}), 400

    word_file = request.files['wordFile']

    word_filename = secure_filename(word_file.filename)
    if not word_filename:
        return jsonify({'error': '유효한 파일 이름을 확인할 수 없습니다.'}), 400

    word_file_path = os.path.join(UPLOAD_FOLDER, word_filename)
    word_file.save(word_file_path)

    template_file_path = os.path.join('static', 'template_final.docx')

    if not os.path.exists(template_file_path):
        return jsonify({'error': '서버에 template_final.docx 파일이 없습니다. static 폴더를 확인하세요.'}), 500

    parsed_words = word_processor.parse_words_from_docx(word_file_path)
    if not parsed_words:
        os.remove(word_file_path)
        return jsonify({'error': '단어 목록 파일에서 단어를 파싱할 수 없습니다.'}), 500

    base_name, _ = os.path.splitext(word_filename)
    output_filename = f"{base_name}_Answer.docx"
    output_path = os.path.join(GENERATED_FOLDER, output_filename)

    success = word_processor.generate_tests_with_docxtpl(parsed_words, template_file_path, output_path)
    if not success:
        os.remove(word_file_path)
        return jsonify({'error': '워드 파일 생성에 실패했습니다.'}), 500

    os.remove(word_file_path)
    return jsonify({'downloadUrl': f'/download/{output_filename}'})

@app.route('/download/<filename>')
def download_file(filename):
    safe_filename = secure_filename(filename)
    file_path = os.path.join(GENERATED_FOLDER, safe_filename)
    if not os.path.exists(file_path):
        abort(404)
    return send_file(
        file_path,
        mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        as_attachment=True,
        download_name=safe_filename
    )

if __name__ == '__main__':
    load_questions_db()
    port = int(os.environ.get("PORT", 5001))
    # Enable debug mode only for local development (port 5001) or if FLASK_DEBUG is explicitly 'true'
    is_local = (port == 5001)
    debug_mode = os.environ.get("FLASK_DEBUG", str(is_local).lower()).lower() == "true"
    app.run(host='0.0.0.0', port=port, debug=debug_mode)