from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
import os
import uuid
import word_processor

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
GENERATED_FOLDER = 'generated'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(GENERATED_FOLDER, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate_workbook():
    # ⭐️ 핵심 수정사항 1: 이제 'wordFile' 하나만 받습니다.
    if 'wordFile' not in request.files:
        return jsonify({'error': '단어 목록 파일이 누락되었습니다.'}), 400

    word_file = request.files['wordFile']
    
    # 임시 파일로 저장
    word_file_path = os.path.join(UPLOAD_FOLDER, word_file.filename)
    word_file.save(word_file_path)

    # ⭐️ 핵심 수정사항 2: 템플릿 파일 경로를 'static' 폴더로 고정합니다.
    template_file_path = os.path.join('static', 'template_final.docx')

    # 템플릿 파일이 실제로 존재하는지 확인
    if not os.path.exists(template_file_path):
        return jsonify({'error': '서버에 template_final.docx 파일이 없습니다. static 폴더를 확인하세요.'}), 500

    # word_processor.py의 함수들을 호출하여 로직 실행
    parsed_words = word_processor.parse_words_from_docx(word_file_path)
    if not parsed_words:
        # 임시 파일 삭제 후 오류 반환
        os.remove(word_file_path)
        return jsonify({'error': '단어 목록 파일에서 단어를 파싱할 수 없습니다.'}), 500
    
    output_filename = f"generated_workbook_{uuid.uuid4()}.docx"
    output_path = os.path.join(GENERATED_FOLDER, output_filename)
    
    success = word_processor.generate_tests_with_docxtpl(parsed_words, template_file_path, output_path)
    if not success:
        os.remove(word_file_path)
        return jsonify({'error': '워드 파일 생성에 실패했습니다.'}), 500

    # 임시 업로드 파일 삭제
    os.remove(word_file_path)

    # 다운로드 URL 반환
    return jsonify({'downloadUrl': f'/download/{output_filename}'})

@app.route('/download/<filename>')
def download_file(filename):
    return send_from_directory(GENERATED_FOLDER, filename, as_attachment=True)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)