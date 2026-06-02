import { useState, useEffect, useMemo, useCallback } from 'react';
import { Upload, AlertTriangle, Check, Trash2, Save, RefreshCw } from 'lucide-react';

const GRADES = ['중1', '중2', '중3', '고1', '고2', '고3'];
const TYPES = ['문장형', '지문형', '서술형'];

/**
 * PDF 추출 · 검토 화면 (로컬 전용, INGEST_MODE).
 * 좌: 배치/문항 목록 | 중: 원본 페이지 이미지 | 우: 추출결과 편집·확정
 */
export default function Ingest() {
  const [categories, setCategories] = useState([]);
  const [grade, setGrade] = useState('고3');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState('');
  const [batches, setBatches] = useState([]);
  const [batch, setBatch] = useState(null);
  const [selectedDraftId, setSelectedDraftId] = useState(null);
  const [draftEdit, setDraftEdit] = useState(null);
  const [catQuery, setCatQuery] = useState('');
  const [showExcluded, setShowExcluded] = useState(false);

  // 카테고리/배치 로드
  useEffect(() => {
    fetch('/api/summit/categories').then(r => r.json()).then(d => setCategories(d.subItems || []));
    refreshBatches();
  }, []);

  const refreshBatches = useCallback(() => {
    fetch('/api/ingest/batches').then(r => r.json()).then(setBatches).catch(() => {});
  }, []);

  const openBatch = useCallback((id) => {
    fetch(`/api/ingest/batch/${id}`).then(r => r.json()).then((b) => {
      setBatch(b);
      const first = (b.drafts || [])[0];
      setSelectedDraftId(first ? first.draft_id : null);
    });
  }, []);

  // 선택된 draft 편집본 동기화
  useEffect(() => {
    if (!batch || !selectedDraftId) { setDraftEdit(null); return; }
    const d = batch.drafts.find(x => x.draft_id === selectedDraftId);
    setDraftEdit(d ? JSON.parse(JSON.stringify(d)) : null);
  }, [batch, selectedDraftId]);

  const handleUpload = async () => {
    if (!file) return;
    setBusy('업로드 중...');
    const fd = new FormData();
    fd.append('pdf', file);
    fd.append('grade', grade);
    const up = await fetch('/api/ingest/upload', { method: 'POST', body: fd }).then(r => r.json());
    if (up.error) { setBusy(''); alert(up.error); return; }
    setBusy(`AI 추출 중... (${up.page_count}쪽, 수 분 소요)`);
    const ex = await fetch('/api/ingest/extract', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: up.job_id, grade, source_pdf: up.source_pdf }),
    }).then(r => r.json());
    setBusy('');
    if (ex.error) { alert(ex.error); return; }
    refreshBatches();
    setBatch(ex);
    setSelectedDraftId((ex.drafts || [])[0]?.draft_id || null);
  };

  const saveDraft = async () => {
    if (!draftEdit) return;
    setBusy('저장 중...');
    await fetch('/api/ingest/draft', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_id: batch.batch_id, draft_id: draftEdit.draft_id, extracted: draftEdit.extracted }),
    });
    setBusy('');
    openBatch(batch.batch_id);
  };

  const confirmDraft = async () => {
    if (!draftEdit) return;
    await saveDraft();
    setBusy('확정 중...');
    const r = await fetch('/api/ingest/confirm', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_id: batch.batch_id, draft_ids: [draftEdit.draft_id] }),
    }).then(r => r.json());
    setBusy('');
    if (r.error) { alert(`검증 실패: ${JSON.stringify(r.details)}`); return; }
    openBatch(batch.batch_id);
  };

  const rejectDraft = async () => {
    if (!draftEdit || !confirm('이 문항을 폐기할까요?')) return;
    await fetch('/api/ingest/reject', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_id: batch.batch_id, draft_id: draftEdit.draft_id }),
    });
    openBatch(batch.batch_id);
  };

  const promoteDraft = async () => {
    if (!draftEdit) return;
    setBusy('어법으로 승격(AI 재분류) 중...');
    await fetch('/api/ingest/promote', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_id: batch.batch_id, draft_id: draftEdit.draft_id }),
    });
    setBusy('');
    openBatch(batch.batch_id);
  };

  const setField = (k, v) => setDraftEdit(d => ({ ...d, extracted: { ...d.extracted, [k]: v } }));
  const setOption = (i, v) => setDraftEdit(d => {
    const opts = [...d.extracted.options]; opts[i] = v;
    return { ...d, extracted: { ...d.extracted, options: opts } };
  });

  const filteredCats = useMemo(() => {
    const q = catQuery.trim();
    return q ? categories.filter(c => c.label.includes(q) || c.subId.includes(q)) : categories;
  }, [catQuery, categories]);

  const drafts = batch?.drafts || [];
  const confirmedCount = drafts.filter(d => d.status === 'confirmed').length;

  // 어법 문항(확인필요 우선) vs 비문법(제외됨) 분리
  const grammarDrafts = useMemo(() => {
    const list = drafts.filter(d => d.status !== 'out_of_scope');
    const rank = (d) => (d.status === 'confirmed' ? 3 : d.status === 'rejected' ? 4 : (d.flags?.length ? 0 : 1));
    return [...list].sort((a, b) => rank(a) - rank(b));
  }, [drafts]);
  const excludedDrafts = useMemo(() => drafts.filter(d => d.status === 'out_of_scope'), [drafts]);
  const isExcluded = draftEdit?.status === 'out_of_scope';

  const e = draftEdit?.extracted;

  return (
    <div className="flex h-full bg-slate-50">
      {/* 좌: 업로드 + 배치/문항 목록 */}
      <div className="w-72 bg-white border-r border-slate-200 flex flex-col h-full">
        <div className="p-4 border-b space-y-2">
          <h2 className="font-bold text-slate-800">PDF 추출 · 검토</h2>
          <select value={grade} onChange={ev => setGrade(ev.target.value)}
            className="w-full border rounded px-2 py-1 text-sm">
            {GRADES.map(g => <option key={g}>{g}</option>)}
          </select>
          <input type="file" accept="application/pdf"
            onChange={ev => setFile(ev.target.files[0])} className="w-full text-xs" />
          <button onClick={handleUpload} disabled={!file || busy}
            className="w-full flex items-center justify-center gap-1 bg-blue-600 text-white text-sm py-1.5 rounded disabled:opacity-50">
            <Upload className="w-4 h-4" /> 업로드 & 추출
          </button>
          {busy && <p className="text-xs text-amber-600">{busy}</p>}
        </div>

        <div className="px-4 py-2 border-b flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">검토 배치</span>
          <button onClick={refreshBatches}><RefreshCw className="w-3.5 h-3.5 text-slate-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          {batches.map(b => (
            <button key={b.batch_id} onClick={() => openBatch(b.batch_id)}
              className={`w-full text-left px-4 py-2 border-b text-xs hover:bg-slate-50 ${batch?.batch_id === b.batch_id ? 'bg-blue-50' : ''}`}>
              <div className="font-medium text-slate-700">{b.grade} · {b.source_pdf || b.batch_id}</div>
              <div className="text-slate-400">{b.confirmed}/{b.total} 확정 · {b.created_at}</div>
            </button>
          ))}

          {batch && (
            <div className="border-t mt-1">
              <div className="px-4 py-1.5 text-[11px] text-slate-500 bg-slate-50">
                어법 {grammarDrafts.length} · 확정 {confirmedCount} · 제외(비문법) {excludedDrafts.length}
              </div>
              {grammarDrafts.map(d => (
                <button key={d.draft_id} onClick={() => setSelectedDraftId(d.draft_id)}
                  className={`w-full text-left px-4 py-2 border-b text-xs flex items-center gap-1.5 hover:bg-slate-50 ${selectedDraftId === d.draft_id ? 'bg-blue-50' : ''}`}>
                  {d.status === 'confirmed' ? <Check className="w-3.5 h-3.5 text-green-600" />
                    : d.status === 'rejected' ? <Trash2 className="w-3.5 h-3.5 text-slate-300" />
                    : d.flags?.length ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    : <span className="w-3.5" />}
                  <span className="flex-1 truncate text-slate-600">p{d.page} · {d.extracted.grammar_category} · {d.extracted.question?.slice(0, 18)}</span>
                </button>
              ))}

              {/* 비문법(제외됨) — 접이식. 잘못 걸러진 어법문항을 승격할 수 있음 */}
              {excludedDrafts.length > 0 && (
                <div className="border-t">
                  <button onClick={() => setShowExcluded(v => !v)}
                    className="w-full text-left px-4 py-2 text-[11px] font-bold text-slate-500 bg-slate-100/70 hover:bg-slate-200/70">
                    {showExcluded ? '▼' : '▶'} 제외됨 (비문법) {excludedDrafts.length}개 — 잘못 걸러졌으면 승격
                  </button>
                  {showExcluded && excludedDrafts.map(d => (
                    <button key={d.draft_id} onClick={() => setSelectedDraftId(d.draft_id)}
                      className={`w-full text-left px-4 py-2 border-b text-xs flex items-center gap-1.5 hover:bg-slate-50 text-slate-400 ${selectedDraftId === d.draft_id ? 'bg-blue-50' : ''}`}>
                      <span className="w-3.5 text-center">·</span>
                      <span className="flex-1 truncate">p{d.page} · {d.extracted.question?.slice(0, 22)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 중: 원본 페이지 이미지 */}
      <div className="w-[40%] bg-slate-100 border-r overflow-y-auto p-4">
        {draftEdit && batch?.job_id ? (
          <>
            <p className="text-xs text-slate-500 mb-2">원본 p{draftEdit.page} (검토용 — 추출결과와 대조)</p>
            <img src={`/api/ingest/page/${batch.job_id}/${draftEdit.page - 1}`}
              alt={`page ${draftEdit.page}`} className="w-full border shadow-sm bg-white" />
          </>
        ) : <p className="text-sm text-slate-400">좌측에서 배치·문항을 선택하세요.</p>}
      </div>

      {/* 우: 편집/확정 */}
      <div className="flex-1 overflow-y-auto p-5">
        {e ? (
          <div className="space-y-3 max-w-xl">
            {isExcluded && (
              <div className="bg-slate-100 border border-slate-300 rounded p-3 text-xs text-slate-600 flex items-center justify-between gap-3">
                <span>이 문항은 <b>비문법으로 자동 제외</b>되었습니다. 실제로 어법 문제라면 승격하세요.</span>
                <button onClick={promoteDraft} disabled={busy}
                  className="shrink-0 bg-indigo-600 text-white px-3 py-1.5 rounded font-bold disabled:opacity-50">
                  어법으로 승격
                </button>
              </div>
            )}
            {draftEdit.flags?.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-800">
                ⚠ {draftEdit.flags.join(' · ')}
                {draftEdit.confidence && (
                  <span className="ml-2 text-amber-500">
                    (정답 {Math.round((draftEdit.confidence.answer || 0) * 100)}% / 분류 {Math.round((draftEdit.confidence.classification || 0) * 100)}%)
                  </span>
                )}
              </div>
            )}

            <label className="block text-xs font-bold text-slate-500">학년 (배치 고정)</label>
            <div className="text-sm font-medium">{batch.grade}</div>

            <label className="block text-xs font-bold text-slate-500">발문 (question)</label>
            <textarea value={e.question} onChange={ev => setField('question', ev.target.value)}
              className="w-full border rounded p-2 text-sm" rows={2} />

            <label className="block text-xs font-bold text-slate-500">지문 (passage) — 있으면 지문형</label>
            <textarea value={e.passage} onChange={ev => setField('passage', ev.target.value)}
              className="w-full border rounded p-2 text-sm font-mono" rows={4} />

            <label className="block text-xs font-bold text-slate-500">보기 (options)</label>
            {e.options.map((opt, i) => (
              <input key={i} value={opt} onChange={ev => setOption(i, ev.target.value)}
                className="w-full border rounded p-1.5 text-sm mb-1" />
            ))}
            <button onClick={() => setField('options', [...e.options, ''])}
              className="text-xs text-blue-600">+ 보기 추가</button>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500">정답 (answer)</label>
                <input value={e.answer} onChange={ev => setField('answer', ev.target.value)}
                  className="w-full border rounded p-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500">형식</label>
                <select value={e.question_type} onChange={ev => setField('question_type', ev.target.value)}
                  className="w-full border rounded p-1.5 text-sm">
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <label className="block text-xs font-bold text-slate-500">문법 소항목 (정답 기준)</label>
            <div className="flex items-center gap-2">
              <input value={e.grammar_category} onChange={ev => setField('grammar_category', ev.target.value)}
                className="w-24 border rounded p-1.5 text-sm font-mono" />
              <span className="text-xs text-slate-500">
                {categories.find(c => c.subId === e.grammar_category)?.label || '미지정'}
              </span>
            </div>
            {draftEdit.ai_candidates?.grammar_category?.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                <span className="text-xs text-slate-400">AI 후보:</span>
                {draftEdit.ai_candidates.grammar_category.map(sid => (
                  <button key={sid} onClick={() => setField('grammar_category', sid)}
                    className="text-xs bg-slate-100 hover:bg-blue-100 rounded px-1.5 py-0.5">{sid}</button>
                ))}
              </div>
            )}
            <input placeholder="소항목 검색..." value={catQuery} onChange={ev => setCatQuery(ev.target.value)}
              className="w-full border rounded p-1.5 text-xs" />
            <div className="max-h-32 overflow-y-auto border rounded">
              {filteredCats.slice(0, 40).map(c => (
                <button key={c.subId} onClick={() => { setField('grammar_category', c.subId); setCatQuery(''); }}
                  className={`block w-full text-left px-2 py-1 text-xs hover:bg-blue-50 ${e.grammar_category === c.subId ? 'bg-blue-100' : ''}`}>
                  {c.label}
                </button>
              ))}
            </div>

            <label className="block text-xs font-bold text-slate-500">해설 (참고)</label>
            <textarea value={e.explanation} onChange={ev => setField('explanation', ev.target.value)}
              className="w-full border rounded p-2 text-sm" rows={2} />

            <div className="flex gap-2 pt-2 sticky bottom-0 bg-white py-2">
              <button onClick={saveDraft} disabled={busy}
                className="flex items-center gap-1 bg-slate-200 text-slate-700 px-3 py-1.5 rounded text-sm">
                <Save className="w-4 h-4" /> 저장
              </button>
              <button onClick={confirmDraft} disabled={busy || draftEdit.status === 'confirmed' || isExcluded}
                title={isExcluded ? '먼저 어법으로 승격하세요' : ''}
                className="flex items-center gap-1 bg-green-600 text-white px-4 py-1.5 rounded text-sm disabled:opacity-50">
                <Check className="w-4 h-4" /> {draftEdit.status === 'confirmed' ? '확정됨' : '확정 저장'}
              </button>
              <button onClick={rejectDraft}
                className="flex items-center gap-1 text-red-600 px-3 py-1.5 rounded text-sm ml-auto">
                <Trash2 className="w-4 h-4" /> 폐기
              </button>
            </div>
          </div>
        ) : <p className="text-sm text-slate-400">문항을 선택하면 편집할 수 있습니다.</p>}
      </div>
    </div>
  );
}
