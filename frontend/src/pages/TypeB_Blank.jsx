import { useState } from 'react';
import WordInputGrid from '../components/WordInputGrid';
import { useSettings } from '../store/SettingsContext';
import { useAppState } from '../store/AppContext';
import { generateAllQuestions } from '../lib/question_logic';
import { exportToDocx } from '../lib/docx_export';
import { Bot, FileDown, AlertCircle, RefreshCw, BarChart, CheckCircle2, Loader2 } from 'lucide-react';
import QuestionTypeSelector from '../components/QuestionTypeSelector';
import { VOCAB_TYPES, getTypeById } from '../lib/questionTypes';

export default function TypeB_Blank() {
  const { typeBState, setTypeBState } = useAppState();
  const { rawText, parsedWords, questions, difficulty, typeCounts, generationProgress } = typeBState;

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const { apiKey, model } = useSettings();

  const updateState = (updates) => setTypeBState(prev => ({ ...prev, ...updates }));

  const handleGenerate = async () => {
    const totalCount = Object.values(typeCounts).reduce((a, b) => a + b, 0);
    if (totalCount === 0) {
      setError('최소 1개 이상의 유형에서 수량을 선택해주세요.');
      return;
    }

    // 유형별 최소 단어 수 체크
    for (const typeId of Object.keys(typeCounts)) {
      const count = typeCounts[typeId];
      if (count <= 0) continue;
      const typeDef = getTypeById(typeId);
      if (typeDef && parsedWords.length < typeDef.minWords) {
        setError(`[${typeDef.name}] 유형에는 최소 ${typeDef.minWords}개의 단어가 필요합니다. 현재 ${parsedWords.length}개.`);
        return;
      }
    }

    // Type 2/3은 API 키 필요
    const needsApi = (typeCounts['blank_matching'] || 0) > 0 || (typeCounts['single_blank'] || 0) > 0;
    if (needsApi && !apiKey) {
      setError('좌측 하단의 설정에서 API 키를 먼저 등록해주세요.');
      return;
    }

    setError('');
    setIsGenerating(true);
    updateState({ questions: [], generationProgress: null });
    
    try {
      const generated = await generateAllQuestions(
        apiKey, model, parsedWords, typeCounts, difficulty,
        (progress) => updateState({ generationProgress: progress })
      );
      updateState({ questions: generated, generationProgress: null });
    } catch (e) {
      setError(e.message || '문제 생성에 실패했습니다.');
      updateState({ generationProgress: null });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    await exportToDocx(questions, '영어문제_다중유형.docx');
  };

  return (
    <div className="max-w-5xl mx-auto p-8 pb-32 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">단어 기반 문제 생성</h1>
        <p className="text-slate-500 mt-2 font-medium">단어 목록만 입력하면 AI가 다양한 유형의 문제를 자동 출제합니다.</p>
      </div>

      <div className="space-y-8">
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm shadow-blue-600/30">1</div>
            <h2 className="text-xl font-bold text-slate-800">단어 목록 입력 <span className="ml-2 text-sm font-medium text-slate-400 font-normal">최소 6개 권장</span></h2>
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
            <div className="flex flex-col gap-5">
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
               </div>

               <QuestionTypeSelector 
                 types={VOCAB_TYPES}
                 typeCounts={typeCounts}
                 onTypeCountsChange={(newCounts) => updateState({ typeCounts: newCounts })}
               />

               {/* 진행 상태 표시 */}
               {generationProgress && (
                 <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl animate-in fade-in duration-300">
                   <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                   <div className="flex-1">
                     <p className="text-sm font-bold text-blue-800">
                       {generationProgress.currentType} 생성 중...
                     </p>
                     <p className="text-xs text-blue-600 mt-0.5">
                       {generationProgress.completedTypes}/{generationProgress.totalTypes} 유형 완료
                     </p>
                   </div>
                 </div>
               )}
               
               <button 
                 onClick={handleGenerate}
                 disabled={isGenerating || parsedWords.length < 1}
                 className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:from-slate-400 disabled:to-slate-400 disabled:shadow-none disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500/50"
               >
                 {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5" />}
                 {isGenerating ? '문제 생성 중...' : '문제 생성'}
               </button>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 border border-red-100">
                <AlertCircle className="w-5 h-5 shrink-0" />
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
                <span className="text-sm text-slate-400 font-medium">총 {questions.length}문항</span>
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
                <QuestionCard key={q.number} q={q} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────
   유형별 카드 렌더러
   ──────────────────────────────────── */

function QuestionCard({ q }) {
  switch (q.typeId) {
    case 'word_matching':
      return <WordMatchingCard q={q} />;
    case 'blank_matching':
      return <BlankMatchingCard q={q} />;
    case 'single_blank':
      return <SingleBlankCard q={q} />;
    default:
      return <BlankMatchingCard q={q} />;
  }
}

/* ── Type 1: 단어-영영풀이 직접 매칭 ── */
function WordMatchingCard({ q }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
      <TypeBadge typeId={q.typeId} />
      <h3 className="font-bold text-lg mb-4">{q.number}. {q.instruction}</h3>

      {/* 단어 행 */}
      <div className="flex items-center gap-4 mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200/60">
        {q.wordLabels.map((wl) => (
          <div key={wl.label} className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-slate-500">{wl.label}</span>
            <span className="text-base font-semibold text-slate-800">{wl.word}</span>
          </div>
        ))}
      </div>

      {/* 영영풀이 목록 */}
      <div className="border border-slate-200 rounded-xl p-4 mb-5 space-y-2.5">
        {q.defLabels.map((dl) => (
          <p key={dl.label} className="text-slate-700 text-[15px]">
            <span className="font-semibold">{dl.label}</span> {dl.definition}
          </p>
        ))}
      </div>

      {/* 선택지 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {q.choices.map((c) => (
          <div key={c.number} className="text-sm font-medium text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="font-bold">{c.number}</span>{' '}
            <span className="text-slate-500 text-xs">
              {q.wordLabels.map(wl => `${wl.label}-${c.mapping[wl.label]}`).join(', ')}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100">
        <p className="text-sm font-bold text-emerald-600">정답: {q.answer}</p>
      </div>
    </div>
  );
}

/* ── Type 2: 빈칸 영영풀이 매칭 (기존) ── */
function BlankMatchingCard({ q }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
      <TypeBadge typeId={q.typeId} />
      <h3 className="font-bold text-lg mb-4">{q.number}. {q.instruction}</h3>
      <div className="bg-slate-50 border-l-4 border-blue-500 p-4 rounded-r-xl mb-4 space-y-2">
        {q.sentences?.map((s, i) => (
          <p key={i} className="text-slate-800 font-medium">ㅇ {s.text}</p>
        ))}
      </div>
      <div className="border border-slate-200 rounded-xl p-4 mb-5">
        <p className="font-bold text-slate-500 mb-3 ml-2">&lt;보기&gt;</p>
        <div className="space-y-2 ml-4">
          {q.options?.map((opt, i) => (
            <p key={i} className="text-slate-700 text-[15px]"><span className="font-semibold">{opt.label}</span> {opt.definition}</p>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {q.choices?.map((c) => (
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
  );
}

/* ── Type 3: 단일 빈칸 영영풀이 5지선다 ── */
function SingleBlankCard({ q }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
      <TypeBadge typeId={q.typeId} />
      <h3 className="font-bold text-lg mb-4">{q.number}. {q.instruction}</h3>

      {/* 문장 */}
      <div className="bg-slate-50 border-l-4 border-violet-500 p-4 rounded-r-xl mb-5">
        <p className="text-slate-800 font-medium text-base leading-relaxed">{q.sentence}</p>
      </div>

      {/* 5지선다 영영풀이 */}
      <div className="space-y-3">
        {q.choices?.map((c) => (
          <div
            key={c.number}
            className="flex items-start gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100"
          >
            <span className="font-bold text-slate-600 mt-0.5 shrink-0">{c.number}</span>
            <span className="text-slate-700 text-[15px]">{c.definition}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100">
        <p className="text-sm font-bold text-emerald-600">정답: {q.answer}</p>
      </div>
    </div>
  );
}

/* ── 유형 배지 ── */
const TYPE_COLORS = {
  word_matching: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: '단어 매칭' },
  blank_matching: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: '빈칸 매칭' },
  single_blank: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', label: '단일 빈칸' },
};

function TypeBadge({ typeId }) {
  const c = TYPE_COLORS[typeId] || TYPE_COLORS.blank_matching;
  return (
    <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md border mb-3 ${c.bg} ${c.text} ${c.border}`}>
      {c.label}
    </span>
  );
}
