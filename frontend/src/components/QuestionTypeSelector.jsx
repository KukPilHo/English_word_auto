import { useState } from 'react';
import { Eye, Hash } from 'lucide-react';
import ExampleModal from './ExampleModal';
import { cn } from '../lib/utils';

/**
 * 유형별 수량 선택 + 예시 보기 컴포넌트
 * @param {Array} types - VOCAB_TYPES 또는 PASSAGE_TYPES
 * @param {Object} typeCounts - { typeId: count } 상태 객체
 * @param {Function} onTypeCountsChange - typeCounts setter
 */
export default function QuestionTypeSelector({ types, typeCounts, onTypeCountsChange }) {
  const [previewType, setPreviewType] = useState(null);

  const handleCountChange = (typeId, value) => {
    onTypeCountsChange({ ...typeCounts, [typeId]: parseInt(value) || 0 });
  };

  const totalCount = Object.values(typeCounts).reduce((a, b) => a + b, 0);

  return (
    <>
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-3">
          <Hash className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-bold text-slate-600">문제 유형별 수량</span>
          <span className="text-xs text-slate-400 ml-auto">총 {totalCount}문항</span>
        </div>

        <div className="space-y-2">
          {types.map((type) => {
            const count = typeCounts[type.id] || 0;
            const isActive = count > 0;

            return (
              <div 
                key={type.id} 
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200",
                  isActive 
                    ? "bg-blue-50/50 border-blue-200/60 shadow-sm" 
                    : "bg-slate-50/50 border-slate-200/60",
                  !type.enabled && "opacity-50"
                )}
              >
                {/* 유형 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-semibold text-sm",
                      isActive ? "text-blue-800" : "text-slate-600"
                    )}>
                      {type.name}
                    </span>
                    {!type.enabled && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">추후</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{type.desc}</p>
                </div>

                {/* 수량 선택 */}
                <select
                  value={count}
                  onChange={(e) => handleCountChange(type.id, e.target.value)}
                  disabled={!type.enabled}
                  className={cn(
                    "w-16 text-center text-sm font-bold rounded-lg border px-2 py-1.5 outline-none transition-all",
                    isActive 
                      ? "bg-white border-blue-300 text-blue-700 focus:ring-2 focus:ring-blue-500/30" 
                      : "bg-white border-slate-200 text-slate-500",
                    !type.enabled && "cursor-not-allowed bg-slate-100"
                  )}
                >
                  {[...Array(11)].map((_, i) => (
                    <option key={i} value={i}>{i}개</option>
                  ))}
                </select>

                {/* 예시 보기 버튼 */}
                <button
                  onClick={() => setPreviewType(type)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all",
                    "bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50"
                  )}
                >
                  <Eye className="w-3.5 h-3.5" />
                  예시
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 예시 모달 */}
      {previewType && (
        <ExampleModal type={previewType} onClose={() => setPreviewType(null)} />
      )}
    </>
  );
}
