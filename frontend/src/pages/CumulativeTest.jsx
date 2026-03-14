import { useState } from 'react';
import { UploadCloud, FileDown, AlertCircle, Loader2 } from 'lucide-react';
import { parseCumulativeWords } from '../lib/cumulative_logic';
import { exportCumulativeTests } from '../lib/cumulative_export';

export default function CumulativeTest() {
  const [file, setFile] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      // .doc 확장자 체크
      if (selectedFile.name.toLowerCase().endsWith('.doc')) {
        setError('구형 워드 파일(.doc)은 브라우저에서 분석할 수 없습니다. 워드에서 "다른 이름으로 저장"을 눌러 최신 파일 형식인 ".docx" 로 저장한 후 업로드해주세요.');
        setFile(null);
        setSuccess(false);
        return;
      }

      setFile(selectedFile);
      setError('');
      setSuccess(false);
    }
  };

  const handleGenerate = async () => {
    if (!file) {
      setError('파일을 먼저 선택해주세요.');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    setSuccess(false);

    try {
      // 1. Parse using mammoth on frontend
      const lessonsObj = await parseCumulativeWords(file);
      const totalLessons = Object.keys(lessonsObj).length;
      
      if (totalLessons === 0) {
         throw new Error('파일에서 유효한 표 구조(단어 리스트)를 찾지 못했습니다.');
      }

      // 2. Generate and download using docx
      const originalName = file.name.replace(/\.[^/.]+$/, "");
      await exportCumulativeTests(lessonsObj, `${originalName}_Answer.docx`);
      
      setSuccess(true);
    } catch (e) {
      console.error(e);
      setError(e.message || '요청 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 animate-in fade-in duration-500">
      <div className="mb-8">
        <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">누적 단어 시험지 생성기</h1>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full border border-purple-200">100% Frontend (No Server)</span>
        </div>
        <p className="text-slate-500 mt-2 font-medium">단어 목록이 포함된 <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">.docx</code> 파일을 업로드하면 서버 없이 **브라우저상에서 즉시 시험지를 생성**합니다. (구형 .doc 파일은 지원하지 않습니다)</p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/80">
        <div className="space-y-6">
          
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
            <UploadCloud className="w-12 h-12 text-slate-400 mb-4" />
            <label className="cursor-pointer">
              <span className="px-4 py-2 bg-white border border-slate-200 shadow-sm rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                .docx 파일 선택
              </span>
              <input 
                type="file" 
                accept=".docx" 
                className="hidden" 
                onChange={handleFileChange}
              />
            </label>
            {file && (
              <p className="mt-4 text-sm font-bold text-purple-600">
                선택된 파일: {file.name}
              </p>
            )}
            {!file && (
              <p className="mt-4 text-sm text-slate-500">
                표 형태로 단어가 정리된 워드 파일을 업로드하세요.
              </p>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 border border-red-100">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium text-sm">{error}</span>
            </div>
          )}

          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !file}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-lg rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
            {isGenerating ? '시험지 파일 생성 중 (초고속)...' : '시험지 생성 및 즉시 다운로드'}
          </button>

          {success && (
            <div className="mt-6 p-6 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
               <p className="text-emerald-800 font-bold">✅ 파일이 성공적으로 생성되어 다운로드 폴더에 저장되었습니다!</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
