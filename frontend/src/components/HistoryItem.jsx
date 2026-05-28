/**
 * HistoryItem — 히스토리 목록 개별 항목
 * - 유형별 색상 배지
 * - 제목 (클릭 시 인라인 편집)
 * - 상대 날짜
 * - 요약 정보
 * - hover 시 삭제 버튼
 */

import { useState, useRef, useEffect } from 'react';
import { Trash2, Check, X, Pencil } from 'lucide-react';
import { TYPE_LABELS, TYPE_COLORS, TYPE_ICONS, formatRelativeDate, getSessionSummary } from '../lib/sessionSchemas';

export default function HistoryItem({
  session,
  isActive,
  onClick,
  onDelete,
  onTitleUpdate,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(session.title);
  const inputRef = useRef(null);

  const colors = TYPE_COLORS[session.type] || TYPE_COLORS.typeB;
  const icon = TYPE_ICONS[session.type] || '📝';
  const label = TYPE_LABELS[session.type] || session.type;
  const summary = getSessionSummary(session);
  const date = formatRelativeDate(session.createdAt);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveTitle = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== session.title) {
      onTitleUpdate(session.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSaveTitle();
    if (e.key === 'Escape') {
      setEditTitle(session.title);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`group relative px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
        isActive
          ? 'bg-blue-50/80 border border-blue-200/60 shadow-sm'
          : 'hover:bg-slate-50 border border-transparent'
      }`}
      onClick={(e) => {
        if (isEditing) return;
        onClick();
      }}
    >
      {/* 배지 + 날짜 행 */}
      <div className="flex items-center justify-between mb-1">
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${colors.bg} ${colors.text}`}
        >
          <span>{icon}</span>
          <span>{label}</span>
        </span>
        <span className="text-[10px] text-slate-400 font-medium">{date}</span>
      </div>

      {/* 제목 */}
      {isEditing ? (
        <div className="flex items-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
          <input
            ref={inputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSaveTitle}
            className="flex-1 text-xs font-semibold text-slate-800 bg-white border border-blue-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-400/50"
          />
          <button
            onClick={handleSaveTitle}
            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              setEditTitle(session.title);
              setIsEditing(false);
            }}
            className="p-1 text-slate-400 hover:bg-slate-100 rounded-md"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 mt-0.5">
          <p className="text-xs font-semibold text-slate-700 truncate flex-1 leading-tight">
            {session.title}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="p-0.5 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity rounded"
          >
            <Pencil className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* 요약 */}
      {summary && (
        <p className="text-[11px] text-slate-400 mt-0.5 font-medium truncate">{summary}</p>
      )}

      {/* 삭제 버튼 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(session.id);
        }}
        className="absolute top-2.5 right-2.5 p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
        title="삭제"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
