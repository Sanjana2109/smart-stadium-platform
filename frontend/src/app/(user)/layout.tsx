

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-teal-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-teal-900/20 via-slate-950 to-slate-950 -z-10" />
      {/* Mobile-first layout container */}
      <main className="max-w-md mx-auto h-screen flex flex-col relative overflow-hidden bg-black/40 backdrop-blur-xl border-x border-white/5">
        {children}
      </main>
    </div>
  );
}
