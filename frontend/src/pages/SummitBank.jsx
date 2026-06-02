import { useState, useMemo, useEffect } from 'react';
import { Printer, Shuffle, Eye, EyeOff } from 'lucide-react';
import CategoryTree from '../components/testbank/CategoryTree';
import QuestionCard from '../components/testbank/QuestionCard';
import grammarCategories from '../data/grammarCategories';
import { randomSelect } from '../data/grammarQuestions';

const QUESTION_TYPES = ['문장형', '지문형', '서술형'];

/**
 * 기출문제 (써밋용) 은행
 *
 * 기존 "기출문제 은행"(/testbank)과 분리된 신규 편성.
 * 3축 분류: 학년(트리에 내장) · 세부 문법유형(트리) · 형식(문장형/지문형/서술형).
 * 난이도(상/중/하) 필터 없음.
 */
export default function SummitBank() {
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('teacher');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 문장형 | 지문형 | 서술형
  const [randomCount, setRandomCount] = useState(10);
  const [displayedQuestions, setDisplayedQuestions] = useState([]);

  const handleCategoryToggle = (leafIds, isChecked) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (isChecked) leafIds.forEach((id) => next.add(id));
      else leafIds.forEach((id) => next.delete(id));
      return next;
    });
  };

  // 백엔드(써밋용 은행)에서 문제 가져오기
  useEffect(() => {
    if (selectedCategories.size === 0) {
      setQuestions([]);
      return;
    }
    setLoading(true);
    const categoryParams = Array.from(selectedCategories).join(',');
    fetch(`/api/summit/questions?categories=${encodeURIComponent(categoryParams)}`)
      .then((res) => res.json())
      .then((data) => {
        setQuestions(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching summit questions:', err);
        setLoading(false);
      });
  }, [selectedCategories]);

  // 형식 필터 (클라이언트)
  const filteredQuestions = useMemo(() => {
    if (typeFilter === 'all') return questions;
    return questions.filter((q) => q.subType === typeFilter);
  }, [questions, typeFilter]);

  useEffect(() => {
    setDisplayedQuestions(filteredQuestions);
    setRandomCount(Math.min(10, filteredQuestions.length));
  }, [filteredQuestions]);

  const handleRandomSelect = () => {
    setDisplayedQuestions(randomSelect(filteredQuestions, randomCount));
  };

  const handlePrint = () => window.print();

  return (
    <div className="flex h-full bg-slate-50 relative">
      {/* 좌측 카테고리 패널 */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-full print:hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            기출문제 (써밋용)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            학년·세부 문법을 선택하세요. (정답 기준 분류)
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          <CategoryTree
            categories={grammarCategories}
            selected={selectedCategories}
            onToggle={handleCategoryToggle}
          />
        </div>
      </div>

      {/* 우측 메인 */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-100/50 print:bg-white">
        {/* 툴바 */}
        <div className="print:hidden bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4 flex-wrap">
          <div className="text-sm text-slate-600">
            <span className="font-bold text-slate-900">{displayedQuestions.length}</span> 문항
          </div>

          {/* 형식 필터 */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {['all', ...QUESTION_TYPES].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                  typeFilter === t ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t === 'all' ? '전체' : t}
              </button>
            ))}
          </div>

          {/* 랜덤 추출 */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={randomCount}
              onChange={(e) => setRandomCount(Number(e.target.value))}
              className="w-16 px-2 py-1 text-sm border border-slate-300 rounded-md"
            />
            <button
              onClick={handleRandomSelect}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              <Shuffle className="w-3.5 h-3.5" /> 랜덤 추출
            </button>
          </div>

          <div className="flex-1" />

          {/* 보기 모드 */}
          <button
            onClick={() => setViewMode((v) => (v === 'teacher' ? 'student' : 'teacher'))}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
          >
            {viewMode === 'teacher' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {viewMode === 'teacher' ? '교사용(정답표시)' : '학생용'}
          </button>

          {/* 인쇄 */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Printer className="w-3.5 h-3.5" /> 인쇄
          </button>
        </div>

        {/* 문서 영역 */}
        <div className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible flex justify-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 print:hidden">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
              <p className="font-medium text-slate-600">문항을 불러오는 중입니다...</p>
            </div>
          ) : displayedQuestions.length > 0 ? (
            <div className="bg-white shadow-sm border border-slate-200 w-full max-w-[800px] min-h-[1000px] p-10 print:p-0 print:border-none print:shadow-none print:max-w-none">
              <div className="hidden print:flex justify-between items-end border-b-2 border-slate-800 pb-4 mb-8">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    대치 SUMMIT 영어 기출문제 (써밋용)
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    {typeFilter !== 'all' && `형식: ${typeFilter} | `}
                    문항 수: {displayedQuestions.length}문항
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold border border-slate-300 px-4 py-2 flex items-center gap-2">
                    <span className="text-slate-500">이름:</span>
                    <span className="w-20 inline-block border-b border-slate-400"></span>
                  </div>
                </div>
              </div>

              <div className="print:columns-2 print:gap-10">
                {displayedQuestions.map((q, index) => (
                  <QuestionCard
                    key={q.id}
                    question={{
                      ...q,
                      question: `${index + 1}. ${(q.question || '').replace(/^\d+\.\s*/, '')}`,
                    }}
                    index={index}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 print:hidden">
              <p>선택된 조건에 해당하는 문제가 없습니다.</p>
              <p className="text-sm mt-1">좌측에서 학년·문법을 선택하세요.</p>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          main, main * { visibility: visible; }
          @page { size: A4; margin: 15mm; }
        }
      `}} />
    </div>
  );
}
