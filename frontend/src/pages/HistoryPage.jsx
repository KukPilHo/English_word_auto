import { useState } from 'react';
import { useHistory } from '../store/HistoryContext';
import { TYPE_LABELS } from '../lib/sessionSchemas';
import HistoryItem from '../components/HistoryItem';
import ConfirmDialog from '../components/ConfirmDialog';
import { History, Trash2, Loader2, SearchX } from 'lucide-react';

const FILTER_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'typeB', label: TYPE_LABELS.typeB },
  { value: 'typeA', label: TYPE_LABELS.typeA },
  { value: 'readingOX', label: TYPE_LABELS.readingOX },
  { value: 'variation', label: TYPE_LABELS.variation },
];

export default function HistoryPage() {
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
    <div className="max-w-5xl mx-auto p-8 pb-32 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <History className="w-7 h-7" />
            </div>
            히스토리 관리
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            생성했던 문제 기록을 한눈에 확인하고, 지난 작업 내역을 다시 불러올 수 있습니다.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-sm font-semibold text-slate-700 bg-white border border-slate-300 shadow-sm rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {sessions.length > 0 && (
            <button
              onClick={handleDeleteAllClick}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 shadow-sm font-bold rounded-xl transition-all"
              title="전체 삭제"
            >
              <Trash2 className="w-4 h-4" />
              <span>전체 삭제</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
            <p className="font-medium">히스토리를 불러오는 중입니다...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <SearchX className="w-12 h-12 mb-4 text-slate-300" />
            <p className="text-lg font-bold text-slate-500">
              {filterType === 'all'
                ? '저장된 세션이 없습니다.'
                : '해당 유형의 세션이 없습니다.'}
            </p>
            <p className="text-sm mt-2">문제를 생성하면 이곳에 자동으로 기록이 남습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((session) => (
              <div key={session.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-slate-200 overflow-hidden">
                <HistoryItem
                  session={session}
                  isActive={activeSessionId === session.id}
                  onClick={() => loadSession(session.id)}
                  onDelete={handleDeleteClick}
                  onTitleUpdate={updateTitle}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {sessions.length > 0 && (
        <div className="mt-4 flex justify-end px-2">
          <p className="text-sm text-slate-400 font-semibold">
            조회된 세션: <span className="text-slate-600">{sessions.length}</span>개
          </p>
        </div>
      )}

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
    </div>
  );
}
