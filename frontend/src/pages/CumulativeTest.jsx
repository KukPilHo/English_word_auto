import { useState } from 'react';
import { UploadCloud, FileDown, AlertCircle, Loader2 } from 'lucide-react';

export default function CumulativeTest() {
  const [file, setFile] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError('');
      setDownloadUrl('');
    }
  };

  const handleGenerate = async () => {
    if (!file) {
      setError('파일을 먼저 선택해주세요.');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    setDownloadUrl('');

    const formData = new FormData();
    formData.append('wordFile', file);

    try {
      // 기존 Flask 백엔드 (app.py) 포트 5001 호출
      const res = await fetch('http://localhost:5001/generate', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '시험지 생성에 실패했습니다. (서버 연결을 확인하세요)');
      }

      const data = await res.json();
      setDownloadUrl(`http://localhost:5001${data.downloadUrl}`);
    } catch (e) {
      setError(e.message || '요청 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">누적 단어 시험지 생성기</h1>
        <p className="text-slate-500 mt-2 font-medium">단어 목록이 포함된 <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">.docx</code> 파일을 업로드하면 기존 방식 그대로 누적 단어 시험지를 자동 생성합니다.</p>
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
              <p className="mt-4 text-sm font-bold text-blue-600">
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
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white font-bold text-lg rounded-xl shadow-md hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
            {isGenerating ? '시험지 생성 중 (서버 처리 중)...' : '시험지 생성 및 다운로드'}
          </button>

          {downloadUrl && (
            <div className="mt-6 p-6 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
               <p className="text-emerald-800 font-bold mb-4">✅ 시험지가 성공적으로 생성되었습니다!</p>
               <a 
                 href={downloadUrl} 
                 className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-sm hover:bg-emerald-700 transition-colors flex items-center gap-2"
               >
                 <FileDown className="w-5 h-5" />
                 다운로드 저장하기
               </a>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
