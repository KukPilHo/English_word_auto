from flask import Flask, request, jsonify, send_file, render_template, abort
from werkzeug.utils import secure_filename
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
    if 'wordFile' not in request.files:
        return jsonify({'error': '단어 목록 파일이 누락되었습니다.'}), 400

    word_file = request.files['wordFile']

    word_filename = secure_filename(word_file.filename)
    if not word_filename:
        return jsonify({'error': '유효한 파일 이름을 확인할 수 없습니다.'}), 400

    # 임시 파일로 저장
    word_file_path = os.path.join(UPLOAD_FOLDER, word_filename)
    word_file.save(word_file_path)

    template_file_path = os.path.join('static', 'template_final.docx')

    if not os.path.exists(template_file_path):
        return jsonify({'error': '서버에 template_final.docx 파일이 없습니다. static 폴더를 확인하세요.'}), 500

    # word_processor.py의 함수들을 호출하여 로직 실행
    parsed_words = word_processor.parse_words_from_docx(word_file_path)
    if not parsed_words:
        # 임시 파일 삭제 후 오류 반환
        os.remove(word_file_path)
        return jsonify({'error': '단어 목록 파일에서 단어를 파싱할 수 없습니다.'}), 500

    base_name, _ = os.path.splitext(word_filename)
    output_filename = f"{base_name}_Answer.docx"
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
    app.run(host='0.0.0.0', port=5001, debug=True)