import { useState, useMemo, useEffect } from 'react';
import CategoryTree from '../components/testbank/CategoryTree';
import QuestionCard from '../components/testbank/QuestionCard';
import TestBankToolbar from '../components/testbank/TestBankToolbar';
import grammarCategories from '../data/grammarCategories';
import { filterByDifficulty, randomSelect } from '../data/grammarQuestions';

export default function TestBank() {
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('teacher'); // 'teacher' or 'student'
  const [difficulty, setDifficulty] = useState('all'); // 'all', '상', '중', '하'
  const [randomCount, setRandomCount] = useState(10);
  const [displayedQuestions, setDisplayedQuestions] = useState([]);

  // 카테고리 선택 핸들러
  const handleCategoryToggle = (leafIds, isChecked) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (isChecked) {
        leafIds.forEach((id) => next.add(id));
      } else {
        leafIds.forEach((id) => next.delete(id));
      }
      return next;
    });
  };

  // 백엔드 API 연동하여 실시간 문제 가져오기
  useEffect(() => {
    if (selectedCategories.size === 0) {
      setQuestions([]);
      return;
    }

    setLoading(true);
    const categoryParams = Array.from(selectedCategories).join(',');
    
    fetch(`/api/questions?categories=${encodeURIComponent(categoryParams)}`)
      .then((res) => res.json())
      .then((data) => {
        setQuestions(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching questions from DB:", err);
        setLoading(false);
      });
  }, [selectedCategories]);

  // 필터링된 전체 문제 (난이도 필터 적용)
  const filteredQuestions = useMemo(() => {
    return filterByDifficulty(questions, difficulty);
  }, [questions, difficulty]);

  // 카테고리나 난이도가 변경되면 표시할 문제 목록 초기화
  useEffect(() => {
    setDisplayedQuestions(filteredQuestions);
    setRandomCount(Math.min(10, filteredQuestions.length));
  }, [filteredQuestions]);

  // 랜덤 추출 핸들러
  const handleRandomSelect = () => {
    setDisplayedQuestions(randomSelect(filteredQuestions, randomCount));
  };

  // 인쇄 핸들러
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex h-full bg-slate-50 relative">
      {/* 1. 좌측 카테고리 패널 (인쇄 시 숨김) */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col h-full print:hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            문법 기출문제 은행
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            원하는 카테고리를 선택하여 문제를 추출하세요.
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

      {/* 2. 우측 메인 영역 */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-100/50 print:bg-white">
        {/* 상단 툴바 (인쇄 시 숨김) */}
        <div className="print:hidden">
          <TestBankToolbar
            totalCount={filteredQuestions.length}
            filteredCount={displayedQuestions.length}
            randomCount={randomCount}
            setRandomCount={setRandomCount}
            viewMode={viewMode}
            setViewMode={setViewMode}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            onRandomSelect={handleRandomSelect}
            onPrint={handlePrint}
          />
        </div>

        {/* 3. A4 문서 영역 (스크롤 가능, 인쇄 시 전체 표시) */}
        <div className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible flex justify-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 print:hidden">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
              <p className="font-medium text-slate-600">대용량 문제 DB에서 관련 문항을 필터링하는 중입니다...</p>
              <p className="text-xs text-slate-400 mt-1">잠시만 기다려주세요.</p>
            </div>
          ) : displayedQuestions.length > 0 ? (
            <div className="bg-white shadow-sm border border-slate-200 w-full max-w-[800px] min-h-[1000px] p-10 print:p-0 print:border-none print:shadow-none print:max-w-none">
              
              {/* 문서 헤더 (인쇄 시 표시) */}
              <div className="hidden print:flex justify-between items-end border-b-2 border-slate-800 pb-4 mb-8">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    대치 SUMMIT 영어 기출문제
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    {difficulty !== 'all' && `난이도: ${difficulty} | `}
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

              {/* 문제 렌더링 (A4 2단 레이아웃 - 인쇄 시) */}
              <div className="print:columns-2 print:gap-10">
                {displayedQuestions.map((q, index) => (
                  <QuestionCard
                    key={q.id}
                    question={{
                      ...q,
                      question: `${index + 1}. ${q.question.replace(/^\d+\.\s*/, '')}` // 번호 재정렬
                    }}
                    index={index}
                    viewMode={viewMode}
                  />
                ))}
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 print:hidden">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p>선택된 카테고리에 해당하는 문제가 없습니다.</p>
              <p className="text-sm mt-1">좌측 패널에서 카테고리를 선택해주세요.</p>
            </div>
          )}
        </div>
      </div>

      {/* 인쇄용 CSS (프린트 시 2단 레이아웃 제어) */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:visible, .print\\:visible * {
            visibility: visible;
          }
          /* 메인 영역만 표시 */
          main, main * {
            visibility: visible;
          }
          /* 여백 최소화 */
          @page {
            size: A4;
            margin: 15mm;
          }
          /* 컴포넌트 내 특정 요소(사이드바, 네비 등) 숨김 방지 로직 적용됨 */
        }
      `}} />
    </div>
  );
}
