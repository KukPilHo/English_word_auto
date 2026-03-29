import { useState, useRef } from 'react';
import WordInputGrid from '../components/WordInputGrid';
import { useSettings } from '../store/SettingsContext';
import { useAppState } from '../store/AppContext';
import { generateTypeAQuestions } from '../lib/question_logic';
import { parseUnstructuredPassage } from '../lib/llm_api';
import { exportToDocx } from '../lib/docx_export';
import { Bot, FileDown, AlertCircle, RefreshCw, FileText, BarChart, UploadCloud, X, Sparkles, CheckCircle2 } from 'lucide-react';
import QuestionTypeSelector from '../components/QuestionTypeSelector';
import { PASSAGE_TYPES, DIFFICULTY_LEVELS } from '../lib/questionTypes';

const DEFAULT_PASSAGES = `[지문 1]
Do you want to make healthy ramyeon? This is my recipe. First, boil water and put in
ramyeon, sauce, and tteok. Cut some carrots and gimchi, and add them. Now, this is my
secret. Put some milk and cheese. It looks tasty, doesn't it?

---

[지문 2]
Last summer, I visited the capital city of France. The weather was perfect, and the people were friendly. I recommend everyone to visit Paris once in their life.`;

export default function TypeA_Passage() {
  const { typeAState, setTypeAState } = useAppState();
  const { rawText, parsedWords, passagesText, passageImage, questions, difficulty, typeCounts } = typeAState;

  const [isGenerating, setIsGenerating] = useState(false);
  const [isParsingPassage, setIsParsingPassage] = useState(false);
  const [parseSuccessMsg, setParseSuccessMsg] = useState('');
  const [error, setError] = useState('');
  const { apiKey, model } = useSettings();
  const fileInputRef = useRef(null);

  const updateState = (updates) => setTypeAState(prev => ({ ...prev, ...updates }));

  const handleGenerate = async () => {
    if (parsedWords.length < 5) {
      setError('단어 목록에 최소 5개의 단어가 필요합니다 (정답 2개 + 오답 3개).');
      return;
    }
    const passagesList = passagesText.split('---').map(p => p.trim()).filter(Boolean);
    if (passagesList.length === 0) {
      setError('최소 1개 이상의 지문이 필요합니다.');
      return;
    }
    if (!apiKey) {
      setError('좌측 하단의 설정에서 API 키를 먼저 등록해주세요.');
      return;
    }
    setError('');
    setIsGenerating(true);
    updateState({ questions: [] });
    
    try {
      const totalCount = Object.values(typeCounts).reduce((a, b) => a + b, 0);
      if (totalCount === 0) {
        setError('최소 1개 이상의 유형을 선택해주세요.');
        return;
      }
      const generated = await generateTypeAQuestions(apiKey, model, parsedWords, passagesList, difficulty, totalCount);
      
      const numbered = generated.map((q, i) => ({ ...q, number: i + 1, type: 'TypeA' }));
      updateState({ questions: numbered });
    } catch (e) {
      setError(e.message || '문제 생성에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePassagePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            e.preventDefault();
            const blob = items[i].getAsFile();
            const reader = new FileReader();
            reader.onload = (event) => updateState({ passageImage: event.target.result });
            reader.readAsDataURL(blob);
            break;
        }
    }
  };

  const handlePassageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => updateState({ passageImage: event.target.result });
        reader.readAsDataURL(file);
    }
  };

  const handleParsePassage = async () => {
    if (!passagesText.trim() && !passageImage) {
        setError('지문 텍스트나 이미지를 영역에 입력해주세요.');
        return;
    }
    if (!apiKey) {
        setError('좌측 하단의 설정에서 API 키를 먼저 등록해주세요.');
        return;
    }
    setError('');
    setParseSuccessMsg('');
    setIsParsingPassage(true);
    try {
        const textRes = await parseUnstructuredPassage(apiKey, model, passagesText, passageImage);
        updateState({ passagesText: textRes, passageImage: null });
        const count = textRes.split('---').map(p => p.trim()).filter(Boolean).length;
        setParseSuccessMsg(`성공적으로 지문을 분석했습니다. (총 ${count}개의 지문 인식됨)`);
        setTimeout(() => setParseSuccessMsg(''), 5000);
    } catch (err) {
        setError(err.message);
    } finally {
        setIsParsingPassage(false);
    }
  };

  const handleDownload = async () => {
    await exportToDocx(questions, '영어문제_지문영영풀이.docx');
  };

  return (
    <div className="max-w-5xl mx-auto p-8 pb-32 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">영영풀이 매칭 (지문 기반)</h1>
        <p className="text-slate-500 mt-2 font-medium">지문과 단어 목록을 기반으로 지문 내용의 영영풀이 매칭 문제를 자동 출제합니다.</p>
      </div>

      <div className="space-y-8">
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm shadow-blue-600/30">1</div>
            <h2 className="text-xl font-bold text-slate-800">단어 목록 입력 <span className="ml-2 text-sm font-medium text-slate-400 font-normal">최소 5개 필요</span></h2>
          </div>
          <WordInputGrid 
              rawText={rawText}
              setRawText={(val) => updateState({ rawText: val })}
              parsedWords={parsedWords}
              onParsedWords={(res) => updateState({ parsedWords: res })}
          />
        </section>

        <section>
          <div className="flex items-center gap-3 mb-4 pt-4">
            <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold shadow-sm shadow-purple-600/30">2</div>
            <h2 className="text-xl font-bold text-slate-800">영어 지문 입력 <span className="ml-2 text-sm font-medium text-slate-400 font-normal">여러 지문은 --- 로 구분</span></h2>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden text-sm transition-shadow focus-within:shadow-md focus-within:border-purple-300">
            <div className="bg-slate-50/80 border-b border-slate-100 flex justify-between items-center px-4 py-3">
              <label className="font-bold text-slate-700 flex items-center gap-2">
                 <FileText className="w-4 h-4 text-purple-500"/>
                 지문 텍스트 (또는 직접 캡처 사진 영역)
              </label>
              <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 shadow-sm rounded-lg hover:bg-slate-50 font-bold text-slate-600 transition-colors"
              >
                 <UploadCloud className="w-3.5 h-3.5 text-purple-500" />
                 사진 업로드 (Ctrl+V 지원)
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePassageFileChange} />
            </div>
            
            <div className="relative">
                {passageImage ? (
                    <div className="w-full h-48 bg-slate-900 flex items-center justify-center relative group">
                       <img src={passageImage} className="max-h-full max-w-full object-contain opacity-80" alt="uploaded passage" />
                       <button 
                         onClick={() => updateState({ passageImage: null })}
                         className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors backdrop-blur-sm shadow-lg"
                       >
                           <X className="w-4 h-4" />
                       </button>
                    </div>
                ) : (
                    <textarea
                      className="w-full h-48 p-5 outline-none resize-y font-mono text-[13px] leading-relaxed text-slate-600 placeholder:text-slate-400"
                      placeholder="여기에 복사한 영어 지문을 붙여넣거나, 시험지 지문 캡처 사진을 입력하세요."
                      value={passagesText}
                      onChange={(e) => updateState({ passagesText: e.target.value })}
                      onPaste={handlePassagePaste}
                    />
                )}
            </div>

            <div className="bg-slate-50/50 p-4 border-t border-slate-100 flex justify-between items-center">
               <div className="flex-1">
                 {parseSuccessMsg && (
                   <span className="text-sm font-bold text-emerald-600 flex items-center gap-1.5 animate-in fade-in">
                     <CheckCircle2 className="w-4 h-4" />
                     {parseSuccessMsg}
                   </span>
                 )}
               </div>
               <button 
                  onClick={handleParsePassage}
                  disabled={isParsingPassage || (!passagesText.trim() && !passageImage)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white font-bold rounded-xl shadow-sm hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-purple-500/50"
               >
                  {isParsingPassage ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-purple-200" />}
                  {isParsingPassage ? '지문 분석 중...' : '지문 분석'}
               </button>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-4 pt-4">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm shadow-indigo-600/30">3</div>
            <h2 className="text-xl font-bold text-slate-800">AI 문제 생성</h2>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                  <h3 className="font-bold text-slate-700">생성 옵션</h3>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <BarChart className="w-4 h-4 text-slate-400" />
                      <select 
                        className="text-[13px] text-slate-700 font-semibold bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400"
                        value={difficulty}
                        onChange={(e) => updateState({ difficulty: e.target.value })}
                      >
                        {DIFFICULTY_LEVELS.map(level => (
                          <option key={level.label} value={level.value}>{level.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
               </div>

               <QuestionTypeSelector 
                  types={PASSAGE_TYPES}
                  typeCounts={typeCounts}
                  onTypeCountsChange={(newCounts) => updateState({ typeCounts: newCounts })}
               />
               
               <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || parsedWords.length < 5 || passagesText.trim().length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:from-slate-400 disabled:to-slate-400 disabled:shadow-none disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500/50"
                >
                  {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5" />}
                  {isGenerating ? '문제 생성 중...' : '문제 생성'}
               </button>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 border border-red-100">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium text-sm">{error}</span>
              </div>
            )}
          </div>
        </section>

        {questions.length > 0 && (
          <section className="animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between gap-3 mb-6 pt-6 border-t border-slate-200/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold shadow-sm shadow-emerald-500/30">4</div>
                <h2 className="text-xl font-bold text-slate-800">결과 확인 및 다운로드</h2>
              </div>
              <button 
                onClick={handleDownload}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl shadow-sm hover:bg-emerald-700 transition-all focus:ring-2 focus:ring-emerald-500/50"
              >
                <FileDown className="w-5 h-5" />
                Word (.docx) 파일 다운로드
              </button>
            </div>

            <div className="space-y-6">
              {questions.map((q) => (
                <div key={q.number} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
                  <h3 className="font-bold text-lg mb-4">{q.number}. {q.instruction}</h3>
                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl mb-4 text-slate-700 leading-relaxed font-serif whitespace-pre-wrap">
                    {q.passage}
                  </div>
                  
                  <div className="border border-slate-200 rounded-xl p-4 mb-5">
                    <p className="font-bold text-slate-500 mb-3 ml-2">&lt;보기&gt;</p>
                    <div className="space-y-2 ml-4">
                      {q.options.map((opt, i) => (
                        <p key={i} className="text-slate-700 text-[15px]">
                          <span className="font-semibold">{opt.label}</span> {opt.definition}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    {q.choices.map((c, i) => (
                      <div key={i} className="text-sm font-medium text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center gap-2">
                         <span className="font-bold">{c.number}</span>
                         <span className="text-slate-500 tracking-wider flex-1 text-center font-mono">
                           {c.combination.join('   ')}
                         </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <p className="text-sm font-bold text-emerald-600">정답: {q.answer}</p>
                    <p className="text-sm text-slate-500 mt-2 bg-slate-50 p-3 rounded-lg">{q.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
