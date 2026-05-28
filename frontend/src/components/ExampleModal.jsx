import { X, Eye } from 'lucide-react';

/**
 * 유형별 예시 문항을 보여주는 모달
 * type.example 텍스트 또는 type.exampleImage 이미지를 표시합니다.
 */
export default function ExampleModal({ type, onClose }) {
  if (!type) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Eye className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">{type.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{type.desc}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* 이미지 예시 */}
          {type.exampleImage && (
            <div className="mb-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">실제 시험 예시</p>
              <div className="bg-white border border-slate-200 rounded-xl p-3 flex justify-center">
                <img 
                  src={type.exampleImage} 
                  alt={`${type.name} 예시`} 
                  className="max-w-full h-auto rounded-lg"
                  style={{ maxHeight: '280px' }}
                />
              </div>
            </div>
          )}

          {/* 텍스트 예시 */}
          {type.example ? (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">문제 형식 미리보기</p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-mono">
                {type.example}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="w-8 h-8 text-slate-300" />
              </div>
              <p className="font-bold text-slate-600 mb-1">예시 문항 준비 중</p>
              <p className="text-sm text-slate-400">이 유형의 예시 문항이 곧 추가될 예정입니다.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
