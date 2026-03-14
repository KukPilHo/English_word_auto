import { useState, useRef } from 'react';
import { Table2, Image as ImageIcon, X, Sparkles, AlertCircle, RefreshCw, UploadCloud } from 'lucide-react';
import { parseUnstructuredWords } from '../lib/llm_api';
import { useSettings } from '../store/SettingsContext';

export default function WordInputGrid({ rawText, setRawText, parsedWords, onParsedWords }) {
  const [imageBase64, setImageBase64] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState('');
  const { apiKey, model } = useSettings();
  const fileInputRef = useRef(null);

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            e.preventDefault();
            const blob = items[i].getAsFile();
            const reader = new FileReader();
            reader.onload = (event) => setImageBase64(event.target.result);
            reader.readAsDataURL(blob);
            break;
        }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => setImageBase64(event.target.result);
        reader.readAsDataURL(file);
    }
  };

  const handleParse = async () => {
    if (!rawText.trim() && !imageBase64) {
        setError('텍스트를 대충 입력하시거나 단어장 사진을 업로드해주세요.');
        return;
    }
    if (!apiKey) {
        setError('좌측 하단의 [설정 및 API 키]에서 API 키를 먼저 등록해주세요.');
        return;
    }
    setError('');
    setIsParsing(true);
    try {
        const words = await parseUnstructuredWords(apiKey, model, rawText, imageBase64);
        const res = words.map((w, i) => ({ id: i+1, ...w }));
        onParsedWords(res);
    } catch (err) {
        setError(err.message);
    } finally {
        setIsParsing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden text-sm transition-shadow focus-within:shadow-md focus-within:border-blue-300">
        <div className="bg-slate-50/80 border-b border-slate-100 flex justify-between items-center px-4 py-3">
          <label className="font-bold text-slate-700 flex items-center gap-2">
             <Table2 className="w-4 h-4 text-blue-500"/>
             단어장 입력 (텍스트 대충 복붙 📝 또는 사진 캡처 📸)
          </label>
          <button 
             onClick={() => fileInputRef.current?.click()}
             className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 shadow-sm rounded-lg hover:bg-slate-50 font-bold text-slate-600 transition-colors"
          >
             <UploadCloud className="w-3.5 h-3.5 text-blue-500" />
             사진 업로드 (Ctrl+V 지원)
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
        </div>
        
        <div className="relative">
            {imageBase64 ? (
                <div className="w-full h-48 bg-slate-900 flex items-center justify-center relative group">
                   <img src={imageBase64} className="max-h-full max-w-full object-contain opacity-80" alt="uploaded word list" />
                   <button 
                     onClick={() => setImageBase64(null)}
                     className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors backdrop-blur-sm shadow-lg"
                   >
                       <X className="w-4 h-4" />
                   </button>
                </div>
            ) : (
                <textarea
                  className="w-full h-48 p-5 outline-none resize-y font-mono text-[13px] leading-relaxed text-slate-600 placeholder:text-slate-400"
                  placeholder="대충 아무렇게나 복사해서 붙여넣어도 AI가 알아서 단어와 영영풀이를 잡아냅니다!&#10;또는 캡처 사진을 복사 후 여기에 그대로 붙여넣기(Ctrl+V) 할 수 있습니다."
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  onPaste={handlePaste}
                />
            )}
        </div>

        {error && (
            <div className="px-4 py-3 bg-red-50 border-t border-red-100 text-red-600 text-[13px] font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
            </div>
        )}

        <div className="bg-slate-50/50 p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
             <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
               <AlertCircle className="w-3.5 h-3.5" />
               입력 후 우측의 분석 버튼을 눌러야 단어가 표로 정리됩니다.
             </span>
             <button 
                onClick={handleParse}
                disabled={isParsing || (!rawText.trim() && !imageBase64)}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500/50"
             >
                {isParsing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-blue-200" />}
                {isParsing ? '단어장 분석 중...' : '단어장 분석'}
             </button>
        </div>
      </div>

      {(parsedWords && parsedWords.length > 0) && (
         <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="bg-emerald-50 border-b border-emerald-100 flex justify-between items-center px-4 py-3">
              <span className="font-bold text-emerald-800 text-sm flex items-center gap-2">
                 <Sparkles className="w-4 h-4 text-emerald-500" />
                 성공적으로 파싱된 {parsedWords.length}개의 데이터
              </span>
           </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 text-[13px]">
                <tr>
                  <th className="px-5 py-3.5 w-1/4">영어 단어</th>
                  <th className="px-5 py-3.5">영영풀이 (없으면 자동 작성됨)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px] text-slate-600">
                {parsedWords.slice(0, 5).map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-bold text-slate-800 text-[14px]">{p.word}</td>
                    <td className="px-5 py-3 truncate max-w-[500px]" title={p.meaning_en}>{p.meaning_en}</td>
                  </tr>
                ))}
                {parsedWords.length > 5 && (
                   <tr>
                     <td colSpan={2} className="px-5 py-3.5 text-center text-slate-400 font-medium bg-slate-50/30">
                       ... 외 {parsedWords.length - 5}개 단어 (생략됨)
                     </td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
         </div>
      )}
    </div>
  );
}
