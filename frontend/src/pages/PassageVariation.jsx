import { useState, useRef } from 'react';
import { useSettings } from '../store/SettingsContext';
import { useAppState } from '../store/AppContext';
import { extractFromInputs, generatePassageVariation } from '../lib/variation_logic';
import { exportToDocx } from '../lib/docx_export'; // Assuming this exists, might need custom implementation if structure differs
import { Bot, FileDown, AlertCircle, RefreshCw, UploadCloud, X, ArrowRight } from 'lucide-react';
import { DIFFICULTY_LEVELS } from '../lib/questionTypes';

export default function PassageVariation() {
  const { variationState, setVariationState } = useAppState();
  const { 
    sourceImages, sourceText, extractedOriginal, extractedQuestion, extractedOptions, 
    transformedPassage, difficulty, isExtracting, isTransforming 
  } = variationState;

  const [error, setError] = useState('');
  const { apiKey } = useSettings();
  const fileInputRef = useRef(null);

  const updateState = (updates) => setVariationState(prev => ({ ...prev, ...updates }));

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => setVariationState(prev => ({ 
                    ...prev, 
                    sourceImages: [...(prev.sourceImages || []), event.target.result] 
                }));
                reader.readAsDataURL(file);
            }
        });
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            e.preventDefault();
            const blob = items[i].getAsFile();
            const reader = new FileReader();
            reader.onload = (event) => setVariationState(prev => ({ 
                ...prev, 
                sourceImages: [...(prev.sourceImages || []), event.target.result] 
            }));
            reader.readAsDataURL(blob);
        }
    }
  };

  const removeImage = (index) => {
      setVariationState(prev => ({
          ...prev,
          sourceImages: prev.sourceImages.filter((_, i) => i !== index)
      }));
  };

  const onExtract = async () => {
    if ((!sourceImages || sourceImages.length === 0) && (!sourceText || sourceText.trim() === '')) return;
    if (!apiKey) {
      setError('좌측 하단의 설정에서 API 키를 먼저 등록해주세요.');
      return;
    }
    setError('');
    updateState({ isExtracting: true, extractedOriginal: '', extractedQuestion: '', extractedOptions: '', transformedPassage: '' });
    try {
      const result = await extractFromInputs(apiKey, sourceImages, sourceText);
      updateState({
        extractedOriginal: result.original_passage,
        extractedQuestion: result.question_text,
        extractedOptions: result.options_text
      });
    } catch (err) {
      setError(err.message);
    } finally {
      updateState({ isExtracting: false });
    }
  };

  const onTransform = async () => {
    if (!extractedOriginal) return;
    if (!apiKey) {
      setError('좌측 하단의 설정에서 API 키를 먼저 등록해주세요.');
      return;
    }
    setError('');
    updateState({ isTransforming: true, transformedPassage: '' });
    try {
      const extractedData = {
        original_passage: extractedOriginal,
        question_text: extractedQuestion,
        options_text: extractedOptions
      };
      const resultText = await generatePassageVariation(apiKey, extractedData, difficulty);
      updateState({ transformedPassage: resultText });
    } catch (err) {
      setError(err.message);
    } finally {
      updateState({ isTransforming: false });
    }
  };

  // Simple download logic for text representation since custom Docx structure might be needed
  const handleDownloadText = () => {
    const content = transformedPassage;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `다풀백_지문변형_${new Date().getTime()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto p-8 pb-32 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">다풀백 지문 변형</h1>
        <p className="text-slate-500 mt-2 font-medium">문제 형식은 그대로 유지하면서 지문의 소재, 인물, 배경 등을 완전히 새롭게 변형합니다.</p>
      </div>

      <div className="space-y-8">
        {/* Step 1: Input & Extract */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm shadow-blue-600/30">1</div>
            <h2 className="text-xl font-bold text-slate-800">문제 이미지 업로드 및 인식</h2>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden text-sm">
            <div className="bg-slate-50 border-b border-slate-100 flex justify-between items-center px-4 py-3">
              <label className="font-bold text-slate-700">시험지 이미지 캡처/업로드 (Ctrl+V) 또는 텍스트 입력</label>
              <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-bold"
              >
                 <UploadCloud className="w-3.5 h-3.5 text-blue-500" /> 사진 선택
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />
            </div>
            
            <div className="relative p-4" tabIndex={0} onPaste={handlePaste}>
                {(sourceImages && sourceImages.length > 0) && (
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                         {sourceImages.map((img, idx) => (
                             <div key={idx} className="relative aspect-auto min-h-[120px] max-h-[200px] bg-slate-100 flex items-center justify-center rounded-xl overflow-hidden border border-slate-200">
                                 <img src={img} className="max-h-full max-w-full object-contain" alt="uploaded" />
                                 <button onClick={() => removeImage(idx)} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-red-500">
                                     <X className="w-4 h-4" />
                                 </button>
                             </div>
                         ))}
                     </div>
                )}
                
                <textarea
                    className="w-full h-32 p-4 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-700 text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-400 font-medium"
                    placeholder="직접 텍스트를 붙여넣거나 입력하세요... (Ctrl+V로 이미지를 바로 붙여넣는 것도 가능합니다)"
                    value={sourceText || ''}
                    onChange={(e) => updateState({ sourceText: e.target.value })}
                />
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
               <button 
                  onClick={onExtract}
                  disabled={isExtracting || ((!sourceImages || sourceImages.length === 0) && (!sourceText || sourceText.trim() === ''))}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-sm hover:bg-blue-700 disabled:opacity-50"
               >
                  {isExtracting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                  {isExtracting ? 'AI 문자 인식 중...' : '텍스트 추출 시작'}
               </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 border border-red-100">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium text-sm">{error}</span>
          </div>
        )}

        {/* Step 2: Side by Side Comparison */}
        {(extractedOriginal || isExtracting) && (
          <section className="animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">2</div>
                <h2 className="text-xl font-bold text-slate-800">지문 변형 및 결과 비교</h2>
              </div>
              
              <div className="flex items-center gap-3">
                <select 
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none font-medium"
                  value={difficulty}
                  onChange={(e) => updateState({ difficulty: e.target.value })}
                >
                  {DIFFICULTY_LEVELS.map(level => (
                    <option key={level.label} value={level.value}>{level.label}</option>
                  ))}
                </select>
                <button 
                  onClick={onTransform}
                  disabled={isTransforming || !extractedOriginal}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isTransforming ? <RefreshCw className="w-4 h-4 animate-spin" /> : <SparklesIcon className="w-4 h-4" />}
                  {isTransforming ? '새로운 지문 생성 중...' : '지문 변형하기'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Original */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative">
                <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full border border-slate-200">원본 (Original)</div>
                {isExtracting ? (
                  <div className="flex justify-center items-center h-full min-h-[300px]"><RefreshCw className="w-8 h-8 text-blue-200 animate-spin" /></div>
                ) : (
                  <div className="space-y-4 pt-2">
                    {extractedQuestion && <p className="font-bold text-slate-800 whitespace-pre-wrap leading-relaxed">{extractedQuestion}</p>}
                    {extractedOriginal && (
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl whitespace-pre-wrap font-serif text-slate-700 leading-relaxed text-sm">
                            {extractedOriginal}
                        </div>
                    )}
                    {extractedOptions && <p className="text-sm font-medium text-slate-600 whitespace-pre-wrap leading-relaxed px-2">{extractedOptions}</p>}
                  </div>
                )}
              </div>

              {/* Right Column: Transformed */}
              <div className="bg-indigo-50/30 rounded-2xl p-5 border border-indigo-100 shadow-sm relative">
                <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full border border-indigo-200 flex items-center gap-1"><SparklesIcon className="w-3 h-3"/> 변형 결과 (Variant)</div>
                {isTransforming ? (
                  <div className="flex justify-center items-center h-full min-h-[300px]"><RefreshCw className="w-8 h-8 text-indigo-300 animate-spin" /></div>
                ) : transformedPassage ? (
                  <div className="space-y-4 pt-2 animate-in fade-in flex flex-col h-full">
                    <div className="p-4 bg-white border border-indigo-100 rounded-xl whitespace-pre-wrap font-serif text-slate-800 leading-relaxed text-[15px] shadow-sm flex-1 overflow-y-auto">
                        {transformedPassage}
                    </div>
                    
                    <div className="pt-4 flex justify-end">
                       <button 
                         onClick={handleDownloadText}
                         className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-900"
                       >
                         <FileDown className="w-4 h-4" /> 변형 결과 다운로드 (.txt)
                       </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-400">
                      <ArrowRight className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-sm font-medium">변형하기 버튼을 누르면 이 곳에 생성됩니다.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function SparklesIcon(props) {
    return (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
            <path d="M12 2L14.26 8.74L21 11L14.26 13.26L12 20L9.74 13.26L3 11L9.74 8.74L12 2ZM6 3L6.87 5.13L9 6L6.87 6.87L6 9L5.13 6.87L3 6L5.13 5.13L6 3ZM18.5 15L19.37 17.13L21.5 18L19.37 18.87L18.5 21L17.63 18.87L15.5 18L17.63 17.13L18.5 15Z"/>
        </svg>
    )
}
