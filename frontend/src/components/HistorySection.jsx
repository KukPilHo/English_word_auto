/**
 * HistorySection — 사이드바에 삽입되는 히스토리 섹션
 * - 유형 필터 드롭다운
 * - 세션 목록 (스크롤, 최신순)
 * - 전체 삭제 버튼
 */

import { useState } from 'react';
import { useHistory } from '../store/HistoryContext';
import { TYPE_LABELS } from '../lib/sessionSchemas';
import HistoryItem from './HistoryItem';
import ConfirmDialog from './ConfirmDialog';
import { History, Trash2, Loader2 } from 'lucide-react';

const FILTER_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'typeB', label: TYPE_LABELS.typeB },
  { value: 'typeA', label: TYPE_LABELS.typeA },
  { value: 'readingOX', label: TYPE_LABELS.readingOX },
  { value: 'variation', label: TYPE_LABELS.variation },
];

export default function HistorySection() {
  const {
    sessions,
    isLoading,
    filterType,
    setFilterType,
    loadSession,
    deleteSession,
    deleteAllSessions,
    updateTitle,
    activeSessionId,
  } = useHistory();

  const [deleteTarget, setDeleteTarget] = useState(null); // session id or 'all'
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDeleteClick = (id) => {
    setDeleteTarget(id);
    setShowDeleteDialog(true);
  };

  const handleDeleteAllClick = () => {
    setDeleteTarget('all');
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteTarget === 'all') {
      await deleteAllSessions();
    } else if (deleteTarget) {
      await deleteSession(deleteTarget);
    }
    setDeleteTarget(null);
  };

  return (
    <>
      <div className="flex flex-col h-full min-h-0">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-2 mb-3">
          <div className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-400/80 uppercase tracking-widest">
              History
            </span>
          </div>
          {sessions.length > 0 && (
            <button
              onClick={handleDeleteAllClick}
              className="p-1 text-slate-300 hover:text-red-500 rounded-md transition-colors"
              title="전체 삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 필터 */}
        <div className="px-2 mb-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200/80 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-0.5 px-1 pb-2 scrollbar-thin">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-slate-400 font-medium">
                {filterType === 'all'
                  ? '저장된 세션이 없습니다'
                  : '해당 유형의 세션이 없습니다'}
              </p>
              <p className="text-[10px] text-slate-300 mt-1">
                문제를 생성하면 자동으로 저장됩니다
              </p>
            </div>
          ) : (
            sessions.map((session) => (
              <HistoryItem
                key={session.id}
                session={session}
                isActive={activeSessionId === session.id}
                onClick={() => loadSession(session.id)}
                onDelete={handleDeleteClick}
                onTitleUpdate={updateTitle}
              />
            ))
          )}
        </div>

        {/* 세션 수 표시 */}
        {sessions.length > 0 && (
          <div className="px-2 mt-2">
            <p className="text-[10px] text-slate-300 font-medium text-center">
              {sessions.length}개 세션
            </p>
          </div>
        )}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleConfirmDelete}
        title={deleteTarget === 'all' ? '전체 세션 삭제' : '세션 삭제'}
        message={
          deleteTarget === 'all'
            ? '모든 세션 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
            : '이 세션을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
        }
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="danger"
      />
    </>
  );
}
