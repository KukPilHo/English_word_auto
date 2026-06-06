import Sidebar from './Sidebar';

export default function Layout({ children }) {
  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-blue-200/60 selection:text-blue-900 print:block print:h-auto print:bg-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full print:h-auto print:overflow-visible print:block">
        {children}
      </main>
    </div>
  );
}
