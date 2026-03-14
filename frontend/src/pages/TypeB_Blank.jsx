import { useState } from 'react';
import WordInputGrid from '../components/WordInputGrid';
import { useSettings } from '../store/SettingsContext';
import { useAppState } from '../store/AppContext';
import { generateTypeBQuestions } from '../lib/question_logic';
import { exportToDocx } from '../lib/docx_export';
import { Bot, FileDown, AlertCircle, RefreshCw, BarChart } from 'lucide-react';

export default function TypeB_Blank() {
  const { typeBState, setTypeBState } = useAppState();
  const { rawText, parsedWords, questions, difficulty } = typeBState;

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const { apiKey, model } = useSettings();

  const updateState = (updates) => setTypeBState(prev => ({ ...prev, ...updates }));

  const handleGenerate = async () => {
    if (parsedWords.length < 6) {
      setError('단어 목록에 최소 6개의 단어가 필요합니다.');
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
      const generated = await generateTypeBQuestions(apiKey, model, parsedWords, 1, difficulty); // 1문항 생성 고정
      
      const numbered = generated.map((q, i) => ({ ...q, number: i + 1, type: 'TypeB' }));
      updateState({ questions: numbered });
    } catch (e) {
      setError(e.message || '문제 생성에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    await exportToDocx(questions, '영어문제_빈칸영영풀이.docx');
  };

  return (
    <div className="max-w-5xl mx-auto p-8 pb-32 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">빈칸 영영풀이 매칭</h1>
        <p className="text-slate-500 mt-2 font-medium">단어 목록만 입력하면 AI가 자연스러운 예문을 생성하여 5지선다 문제를 출제합니다.</p>
      </div>

      <div className="space-y-8">
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm shadow-blue-600/30">1</div>
            <h2 className="text-xl font-bold text-slate-800">단어 목록 입력 <span className="ml-2 text-sm font-medium text-slate-400 font-normal">최소 6개 필요</span></h2>
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
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm shadow-indigo-600/30">2</div>
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
                        <option value="중등 수준">중등 수준</option>
                        <option value="고1 수준">고1 수준</option>
                        <option value="고2 수준">고2 수준</option>
                        <option value="고3 수준">고3 수준</option>
                      </select>
                    </div>
                  </div>
               </div>
               
               <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || parsedWords.length < 6}
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
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold shadow-sm shadow-emerald-500/30">3</div>
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
                  <div className="bg-slate-50 border-l-4 border-blue-500 p-4 rounded-r-xl mb-4 space-y-2">
                    {q.sentences.map((s, i) => (
                      <p key={i} className="text-slate-800 font-medium">ㅇ {s.text}</p>
                    ))}
                  </div>
                  <div className="border border-slate-200 rounded-xl p-4 mb-5">
                    <p className="font-bold text-slate-500 mb-3 ml-2">&lt;보기&gt;</p>
                    <div className="space-y-2 ml-4">
                      {q.options.map((opt, i) => (
                        <p key={i} className="text-slate-700 text-[15px]"><span className="font-semibold">{opt.label}</span> {opt.definition}</p>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    {q.choices.map((c) => (
                      <div key={c.number} className="text-sm font-medium text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center gap-2">
                         <span className="font-bold">{c.number}</span>
                         <span className="text-slate-500 tracking-wider flex-1 text-center font-mono">
                           {Object.values(c.mapping).join(' ')}
                         </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100">
                    <p className="text-sm font-bold text-emerald-600">정답: {q.answer}</p>
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
