import { Shuffle, Printer, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * 기출문제 은행 상단 툴바
 */
export default function TestBankToolbar({
  totalCount,
  filteredCount,
  randomCount,
  setRandomCount,
  viewMode,
  setViewMode,
  difficulty,
  setDifficulty,
  onRandomSelect,
  onPrint,
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10 flex-wrap">
      {/* 좌측: 카운트 + 랜덤 */}
      <div className="flex items-center gap-3">
        <div className="text-sm text-slate-600">
          전체: <span className="text-blue-600 font-bold">{totalCount}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-slate-500">선택:</span>
          <input
            type="number"
            min={1}
            max={totalCount || 1}
            value={randomCount}
            onChange={(e) => setRandomCount(Number(e.target.value))}
            className="w-14 h-7 text-sm text-center border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <button
            onClick={onRandomSelect}
            className="flex items-center gap-1 px-2.5 py-1 text-sm font-medium border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
          >
            <Shuffle className="w-3.5 h-3.5" />
            랜덤
          </button>
        </div>
      </div>

      {/* 우측: 난이도 + 뷰 전환 + 인쇄 */}
      <div className="flex items-center gap-2">
        {/* 난이도 필터 */}
        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden text-xs">
          {['all', '상', '중', '하'].map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={cn(
                'px-2.5 py-1.5 font-medium transition-colors',
                difficulty === d
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 hover:bg-slate-50'
              )}
            >
              {d === 'all' ? '전체' : d}
            </button>
          ))}
        </div>

        {/* 교사/학생 전환 */}
        <button
          onClick={() => setViewMode(viewMode === 'teacher' ? 'student' : 'teacher')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all',
            viewMode === 'teacher'
              ? 'bg-violet-50 border-violet-200 text-violet-700'
              : 'bg-slate-50 border-slate-200 text-slate-600'
          )}
        >
          {viewMode === 'teacher' ? (
            <><Eye className="w-3.5 h-3.5" /> 교사용</>
          ) : (
            <><EyeOff className="w-3.5 h-3.5" /> 학생용</>
          )}
        </button>

        {/* 인쇄 */}
        <button
          onClick={onPrint}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          인쇄
        </button>
      </div>
    </div>
  );
}
