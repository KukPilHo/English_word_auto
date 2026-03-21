import { Settings, FileText, CheckSquare, Layers, BookOpenCheck, RefreshCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState } from 'react';
import ApiKeyModal from './ApiKeyModal';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { name: '누적 시험지', path: '/cumulative', icon: Layers, desc: '100% 브라우저 기반' },
  { name: '빈칸 매칭 (문장생성)', path: '/', icon: CheckSquare, desc: 'AI 예문 자동 생성형' },
  { name: '영영풀이 (지문기반)', path: '/passage', icon: FileText, desc: '입력된 지문 기반' },
  { name: 'Reading 일치/불일치', path: '/reading-ox', icon: BookOpenCheck, desc: '지문 → O/X 문제 생성' },
  { name: '다풀백 지문 변형', path: '/variation', icon: RefreshCcw, desc: '문제 원본 유지, 지문만 변형' },
];

export default function Sidebar() {
  const [isModalOpen, setModalOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      <div className="w-72 h-screen border-r border-slate-200/60 bg-white flex flex-col shrink-0 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-10 relative">
        <div className="p-6 border-b border-slate-100 flex flex-col items-center justify-center">
          <div className="w-24 h-24 rounded-full border-[3px] border-[#223B82] flex items-center justify-center bg-white shadow-sm mb-4 relative overflow-hidden">
             <div className="flex flex-col items-start justify-center pt-0.5">
                <span className="text-[#C01554] font-black text-[15px] leading-tight tracking-tight ml-0.5">Rachel's</span>
                <span className="text-[#32B4CA] font-black text-[11px] leading-tight mt-0.5 ml-0.5">대치</span>
                <span className="text-[#1A2576] font-black text-[20px] leading-none tracking-tighter mt-0.5">SUMMIT</span>
             </div>
          </div>
          <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-widest text-center">영어 문제 자동 생성기</p>
        </div>

        <div className="flex-1 overflow-y-auto py-8 px-4 space-y-2">
          <div className="text-xs font-bold text-slate-400/80 uppercase tracking-widest mb-4 px-2">Generator Tools</div>
          {navItems.map((item) => {
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

        <div className="p-5 border-t border-slate-100/60 bg-slate-50/50">
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
