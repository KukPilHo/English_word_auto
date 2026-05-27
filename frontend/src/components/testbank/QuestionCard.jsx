import { cn } from '../../lib/utils';

/**
 * 개별 문제 렌더링 컴포넌트
 */
export default function QuestionCard({ question, index, viewMode }) {
  const isTeacher = viewMode === 'teacher';

  return (
    <div className="mb-6 break-inside-avoid" id={`question-${question.id}`}>
      <p className="text-[15px] font-bold text-slate-900 leading-relaxed whitespace-pre-wrap mb-2">
        {question.question}
      </p>

      {question.passage && (
        <div className="border border-slate-300 rounded-lg p-4 mb-3 bg-white">
          <p className="text-[14px] text-slate-800 leading-relaxed whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: question.passage }} />
        </div>
      )}

      {question.options && question.options.length > 0 && (
        <div className="space-y-1.5 mb-3 pl-2">
          {question.options.map((opt, i) => (
            <p key={i}
              className={cn('text-[14px] leading-relaxed',
                isTeacher && opt.startsWith(question.answer) ? 'text-red-600 font-bold' : 'text-slate-700')}
              dangerouslySetInnerHTML={{ __html: opt }} />
          ))}
        </div>
      )}

      {isTeacher && (
        <div className="mt-3 bg-blue-50/60 border border-blue-200/60 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">정답</span>
            <span className="text-sm font-bold text-blue-800">{question.answer}</span>
            {question.difficulty && (
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                question.difficulty === '상' ? 'bg-red-100 text-red-700'
                  : question.difficulty === '중' ? 'bg-amber-100 text-amber-700'
                  : 'bg-green-100 text-green-700')}>
                {question.difficulty}
              </span>
            )}
          </div>
          {question.explanation && (
            <p className="text-[13px] text-slate-600 leading-relaxed">{question.explanation}</p>
          )}
          {question.source && (
            <p className="text-[11px] text-slate-400 mt-2">출처: {question.source} {question.sourceIndex}</p>
          )}
        </div>
      )}

      {!isTeacher && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-slate-400">정답:</span>
          <div className="w-16 border-b border-slate-300" />
        </div>
      )}
    </div>
  );
}
