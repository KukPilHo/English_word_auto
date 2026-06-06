import { Settings, FileText, CheckSquare, Layers, BookOpenCheck, RefreshCcw, ExternalLink, History, FileArchive, Stamp, ScanLine, Link2, ShieldCheck, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState, useEffect } from 'react';
import ApiKeyModal from './ApiKeyModal';
import { useAdmin } from '../store/AdminContext';
import { Link, useLocation } from 'react-router-dom';

// 관리자 전용으로 숨기려면 해당 항목에 adminOnly: true 한 줄만 추가하면 됨.
// (관리자 모드는 URL ?admin=<코드> 로 진입 — store/AdminContext.jsx)
const navItems = [
  { name: '기출문제 은행', path: '/testbank', icon: FileArchive, desc: '문법별 기출문제 추출 및 인쇄' },
  { name: '기출문제 (써밋용)', path: '/summit-bank', icon: Stamp, desc: '정답 기준 문법 분류 · 신규 편성' },
  { name: '누적 시험지', path: '/cumulative', icon: Layers, desc: '100% 브라우저 기반' },
  { name: '빈칸 매칭 (문장생성)', path: '/', icon: CheckSquare, desc: 'AI 예문 자동 생성형' },
  { name: '영영풀이 (지문기반)', path: '/passage', icon: FileText, desc: '입력된 지문 기반' },
  { name: 'Reading 일치/불일치', path: '/reading-ox', icon: BookOpenCheck, desc: '지문 → O/X 문제 생성' },
  { name: 'Reading 일치 짝짓기', path: '/reading-match', icon: Link2, desc: '지문 → 일치 진술 짝 고르기' },
  { name: '다풀백 지문 변형', path: '/variation', icon: RefreshCcw, desc: '문제 원본 유지, 지문만 변형' },
  { name: '히스토리 관리', path: '/history', icon: History, desc: '생성된 문제 기록 확인' },
];

export default function Sidebar() {
  const [isModalOpen, setModalOpen] = useState(false);
  const [ingestEnabled, setIngestEnabled] = useState(false);
  const location = useLocation();
  const { isAdmin, exitAdmin } = useAdmin();

  // 추출/검토 메뉴는 로컬(INGEST_MODE)에서만 노출 (운영 빌드 숨김)
  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(d => setIngestEnabled(!!d.ingest)).catch(() => {});
  }, []);

  const base = ingestEnabled
    ? [...navItems, { name: '추출 · 검토 (로컬)', path: '/ingest', icon: ScanLine, desc: 'PDF → AI 추출 → 검토 확정' }]
    : navItems;

  // 관리자 전용(adminOnly) 항목은 관리자 모드일 때만 노출
  const items = base.filter(item => !item.adminOnly || isAdmin);

  return (
    <>
      <div className="w-72 h-screen border-r border-slate-200/60 bg-white flex flex-col shrink-0 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-10 relative print:hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col items-center justify-center">
          <div className="w-24 h-24 shrink-0 rounded-full border-[3px] border-[#223B82] flex items-center justify-center bg-white shadow-sm mb-4 relative overflow-hidden">
             <div className="flex flex-col items-start justify-center pt-0.5 whitespace-nowrap">
                <span className="text-[#C01554] font-black text-[15px] leading-tight tracking-tight ml-0.5">Rachel's</span>
                <span className="text-[#32B4CA] font-black text-[11px] leading-tight mt-0.5 ml-0.5">대치</span>
                <span className="text-[#1A2576] font-black text-[20px] leading-none tracking-tighter mt-0.5">SUMMIT</span>
             </div>
          </div>
          <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-widest text-center">영어 문제 자동 생성기</p>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden py-6 px-4">
          <div className="space-y-2 flex-1 overflow-y-auto pb-2 scrollbar-thin">
            <a
              href="https://kukpilho.github.io/CKE_2/"
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden hover:bg-slate-50 border border-transparent mb-6"
          >
            <div className="flex flex-col">
              <div className="flex items-center gap-3 relative z-10 hover:cursor-pointer">
                <div className="p-1.5 rounded-lg transition-colors bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-blue-600">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <span className="font-bold text-[15px] transition-colors text-slate-600 group-hover:text-slate-900">CKE 링크</span>
              </div>
              <span className="text-[13px] ml-[44px] mt-1 font-medium transition-colors cursor-pointer text-slate-400 group-hover:text-slate-500">
                대치써밋 CKE 생성기
              </span>
            </div>
          </a>

          <div className="text-xs font-bold text-slate-400/80 uppercase tracking-widest mb-4 px-2 mt-4">Generator Tools</div>
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "block px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                  isActive ? "bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100/50 shadow-sm" : "hover:bg-slate-50 border border-transparent"
                )}
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-3 relative z-10 hover:cursor-pointer">
                    <div className={cn("p-1.5 rounded-lg transition-colors", isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-blue-600")}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={cn("font-bold text-[15px] transition-colors", isActive ? "text-blue-900" : "text-slate-600 group-hover:text-slate-900")}>{item.name}</span>
                  </div>
                  {item.desc && (
                    <span className={cn("text-[13px] ml-[44px] mt-1 font-medium transition-colors cursor-pointer", isActive ? "text-blue-600/70" : "text-slate-400 group-hover:text-slate-500")}>
                      {item.desc}
                    </span>
                  )}
                </div>
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-r-md blur-[1px]"></div>
                )}
              </Link>
            )
          })}

          </div>

          {/* History Section Removed - Moved to independent page */}
        </div>

        <div className="p-5 border-t border-slate-100/60 bg-slate-50/50 space-y-3">
          {isAdmin && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
              <span className="flex items-center gap-2 text-[13px] font-bold text-amber-700">
                <ShieldCheck className="w-4 h-4" />
                관리자 모드
              </span>
              <button
                onClick={exitAdmin}
                className="flex items-center gap-1 text-[12px] font-bold text-amber-600 hover:text-amber-800 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                종료
              </button>
            </div>
          )}
          <button
            onClick={() => setModalOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 rounded-xl bg-white shadow-sm border border-slate-200/60 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 transition-all group"
          >
            <div className="p-1 bg-slate-100 rounded-md group-hover:bg-slate-200/70 transition-colors">
               <Settings className="w-4 h-4 text-slate-500 group-hover:text-slate-700" />
            </div>
            <span>설정 및 API 키</span>
          </button>
        </div>
      </div>
      <ApiKeyModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
