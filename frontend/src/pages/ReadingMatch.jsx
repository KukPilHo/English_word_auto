import { useState } from 'react';
import { useSettings } from '../store/SettingsContext';
import { useAppState } from '../store/AppContext';
import { generateReadingMatchQuestions } from '../lib/question_logic';
import { exportToDocx } from '../lib/docx_export';
import { Bot, FileDown, AlertCircle, RefreshCw, BarChart, Loader2, BookOpen } from 'lucide-react';
import { DIFFICULTY_LEVELS } from '../lib/questionTypes';
import { useAutoSave } from '../hooks/useAutoSave';

export default function ReadingMatch() {
  const { readingMatchState, setReadingMatchState } = useAppState();
  const { passageText, questions, difficulty, questionCount, generationProgress } = readingMatchState;

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const { apiKey, model } = useSettings();
  const { saveToHistory } = useAutoSave('readingMatch');

  const updateState = (updates) => setReadingMatchState(prev => ({ ...prev, ...updates }));

  const handleGenerate = async () => {
    if (!passageText || passageText.trim().length < 30) {
      setError('최소 30자 이상의 영어 지문을 입력해주세요.');
      return;
    }
    if (!apiKey) {
      setError('좌측 하단의 설정에서 API 키를 먼저 등록해주세요.');
      return;
    }

    setError('');
    setIsGenerating(true);
    updateState({ questions: [], generationProgress: { phase: 'generating' } });

    try {
      const generated = await generateReadingMatchQuestions(apiKey, model, passageText, questionCount, difficulty);
      const numbered = generated.map((q, i) => ({ ...q, number: i + 1 }));
      updateState({ questions: numbered, generationProgress: null });

      // 자동 저장
      await saveToHistory(
        { passageText },
        { difficulty, questionCount },
        { questions: numbered },
        { questionCount: numbered.length }
      );
    } catch (e) {
      setError(e.message || '문제 생성에 실패했습니다.');
      updateState({ generationProgress: null });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    await exportToDocx(questions, '영어문제_일치짝짓기.docx');
  };

  return (
    <div className="max-w-5xl mx-auto p-8 pb-32 animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Reading 일치 짝짓기</h1>
        <p className="text-slate-500 mt-2 font-medium">영어 지문을 입력하면 AI가 7개 진술(ⓐ~ⓖ) 중 윗글로 알 수 있는 것끼리 짝지은 선택지를 고르는 문제를 출제합니다.</p>
      </div>

      <div className="space-y-8">
        {/* Step 1: 지문 입력 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold shadow-sm shadow-rose-600/30">1</div>
            <h2 className="text-xl font-bold text-slate-800">영어 지문 입력</h2>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <textarea
              value={passageText}
              onChange={(e) => updateState({ passageText: e.target.value })}
              placeholder="영어 지문을 여기에 붙여넣기 하세요..."
              className="w-full h-56 p-5 text-sm text-slate-800 leading-relaxed resize-y outline-none focus:ring-2 focus:ring-rose-500/30 rounded-2xl transition-all font-medium"
            />
          </div>
        </section>

        {/* Step 2: 생성 옵션 */}
        <section>
          <div className="flex items-center gap-3 mb-4 pt-4">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm shadow-indigo-600/30">2</div>
            <h2 className="text-xl font-bold text-slate-800">AI 문제 생성</h2>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-6">
                {/* 난이도 */}
                <div className="flex items-center gap-2">
                  <BarChart className="w-4 h-4 text-slate-400" />
                  <select
                    className="text-[13px] text-slate-700 font-semibold bg-slate-50 border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-rose-400"
                    value={difficulty}
                    onChange={(e) => updateState({ difficulty: e.target.value })}
                  >
                    {DIFFICULTY_LEVELS.map(level => (
                      <option key={level.label} value={level.value}>{level.label}</option>
                    ))}
                  </select>
                </div>

                {/* 생성 개수 */}
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-slate-400" />
                  <select
                    className="text-[13px] text-slate-700 font-semibold bg-slate-50 border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-rose-400"
                    value={questionCount}
                    onChange={(e) => updateState({ questionCount: parseInt(e.target.value) })}
                  >
                    {[1, 2, 3, 4, 5].map(n => (
                      <option key={n} value={n}>{n}문제</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 진행 상태 */}
              {generationProgress && (
                <div className="flex items-center gap-3 px-4 py-3 bg-rose-50 border border-rose-100 rounded-xl animate-in fade-in duration-300">
                  <Loader2 className="w-5 h-5 text-rose-600 animate-spin" />
                  <p className="text-sm font-bold text-rose-800">일치 짝짓기 문제 생성 중...</p>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !passageText.trim()}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:from-rose-700 hover:to-pink-700 transition-all disabled:from-slate-400 disabled:to-slate-400 disabled:shadow-none disabled:cursor-not-allowed focus:ring-2 focus:ring-rose-500/50"
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

        {/* Step 3: 결과 */}
        {questions.length > 0 && (
          <section className="animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between gap-3 mb-6 pt-6 border-t border-slate-200/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold shadow-sm shadow-pink-500/30">3</div>
                <h2 className="text-xl font-bold text-slate-800">결과 확인 및 다운로드</h2>
                <span className="text-sm text-slate-400 font-medium">총 {questions.length}문항</span>
              </div>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-5 py-2.5 bg-pink-600 text-white font-bold rounded-xl shadow-sm hover:bg-pink-700 transition-all focus:ring-2 focus:ring-pink-500/50"
              >
                <FileDown className="w-5 h-5" />
                Word (.docx) 다운로드
              </button>
            </div>

            <div className="space-y-6">
              {questions.map((q) => (
                <ReadingMatchCard key={q.number} q={q} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/* ── Reading 일치 짝짓기 카드 ── */
function ReadingMatchCard({ q }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
      <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-md border mb-3 bg-rose-50 text-rose-700 border-rose-200">
        일치 짝짓기
      </span>
      <h3 className="font-bold text-lg mb-4">{q.number}. {q.instruction}</h3>

      {/* 지문 박스 */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-5 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
        {q.passage}
      </div>

      {/* 보기 진술 */}
      <div className="border border-slate-200 rounded-xl p-4 mb-5">
        <p className="font-bold text-slate-500 mb-3 ml-2">&lt;보기&gt;</p>
        <div className="space-y-3 ml-2">
          {q.statements?.map((s) => (
            <div key={s.label} className="flex items-start gap-2.5">
              <span className="font-bold text-slate-600 mt-0.5 shrink-0">{s.label}</span>
              <span className="text-slate-700 text-[15px]">{s.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 짝 선택지 */}
      <div className="space-y-2">
        {q.choices?.map((c) => (
          <div
            key={c.number}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${c.is_correct ? 'bg-emerald-50' : ''}`}
          >
            <span className="font-bold text-slate-600 shrink-0">{c.number}</span>
            <span className="font-semibold text-slate-700">{c.pair.join(', ')}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100">
        <p className="text-sm font-bold text-emerald-600">정답: {q.answer}</p>
      </div>
    </div>
  );
}
