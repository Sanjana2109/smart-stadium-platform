"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Sliders, BarChart3 } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Live Dashboard', icon: LayoutDashboard },
  { href: '/dashboard#simulation', label: 'Simulation Controls', icon: Sliders },
  { href: '/analytics', label: 'AI Analytics', icon: BarChart3, badge: 'Soon' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-50 selection:bg-purple-500/30 flex">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-[#0a0a0a] to-[#0a0a0a] -z-10" />
      
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-black/50 backdrop-blur-md hidden md:flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-teal-400 bg-clip-text text-transparent">
            Nexus Command
          </h1>
          <p className="text-[10px] text-slate-600 mt-1">Stadium Operations Center</p>
        </div>
        <nav className="flex-1 px-4 space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href.includes('#') && pathname === '/dashboard');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive && !item.badge
                    ? 'bg-white/5 border border-white/10 text-white'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon size={16} />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 font-semibold">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-[10px] text-slate-500">Hackathon Demo Mode</p>
            <p className="text-xs text-slate-300 mt-0.5">All data is simulated</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto p-8 relative">
        {children}
      </main>
    </div>
  );
}
