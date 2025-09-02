import os
from flask import Flask, request, send_from_directory, jsonify
from werkzeug.utils import secure_filename
from word_processor import create_word_test
from flask_cors import CORS # CORS 추가

# --- 설정 ---
UPLOAD_FOLDER = 'uploads'
GENERATED_FOLDER = 'generated'
TEMPLATE_FILE = 'static/template_final.docx'
ALLOWED_EXTENSIONS = {'docx'}

app = Flask(__name__)
# CORS 설정 추가: 모든 도메인에서의 요청을 허용합니다.
CORS(app) 

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['GENERATED_FOLDER'] = GENERATED_FOLDER
app.secret_key = 'supersecretkey'

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(GENERATED_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# API 엔드포인트: 파일 업로드 및 처리
@app.route('/upload', methods=['POST'])
def upload_file_api():
    if 'file' not in request.files:
        return jsonify({'error': '파일이 없습니다.'}), 400
    
    file = request.files['file']
    
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({'error': '유효하지 않은 파일입니다.'}), 400

    filename = secure_filename(file.filename)
    input_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    base, extension = os.path.splitext(filename)
    output_filename = f"{base}_result.docx"
    output_path = os.path.join(app.config['GENERATED_FOLDER'], output_filename)
    
    file.save(input_path)
    
    success = create_word_test(input_path, TEMPLATE_FILE, output_path)
    
    if success:
        # 성공 시, 다운로드 가능한 URL을 JSON으로 응답
        download_url = f"/downloads/{output_filename}"
        return jsonify({'downloadUrl': download_url})
    else:
        return jsonify({'error': '파일 처리 중 오류가 발생했습니다.'}), 500

# 파일 다운로드 라우트 (이전과 동일)
@app.route('/downloads/<name>')
def download_file(name):
    return send_from_directory(app.config["GENERATED_FOLDER"], name, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)