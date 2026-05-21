import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
      
      <div className="z-10 text-center space-y-8 max-w-2xl px-4">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter bg-gradient-to-br from-white via-slate-300 to-slate-500 bg-clip-text text-transparent">
            Nexus Stadium
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 font-medium tracking-tight">
            AI-Powered Crowd Management & Operations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full pt-8">
          <Link 
            href="/dashboard"
            className="group relative p-1 rounded-2xl bg-gradient-to-b from-purple-500/20 to-purple-500/0 hover:from-purple-500/40 transition-colors"
          >
            <div className="h-full w-full bg-black/80 backdrop-blur-xl rounded-xl p-8 border border-white/5 flex flex-col items-center justify-center gap-4 group-hover:bg-black/60 transition-colors">
              <div className="p-4 rounded-full bg-purple-500/20 text-purple-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white group-hover:text-purple-300 transition-colors">Admin Command</h3>
                <p className="text-sm text-slate-400 mt-2">Simulation & Control Center</p>
              </div>
            </div>
          </Link>

          <Link 
            href="/map"
            className="group relative p-1 rounded-2xl bg-gradient-to-b from-teal-500/20 to-teal-500/0 hover:from-teal-500/40 transition-colors"
          >
            <div className="h-full w-full bg-black/80 backdrop-blur-xl rounded-xl p-8 border border-white/5 flex flex-col items-center justify-center gap-4 group-hover:bg-black/60 transition-colors">
              <div className="p-4 rounded-full bg-teal-500/20 text-teal-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white group-hover:text-teal-300 transition-colors">Attendee App</h3>
                <p className="text-sm text-slate-400 mt-2">Mobile Map & AI Copilot</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
