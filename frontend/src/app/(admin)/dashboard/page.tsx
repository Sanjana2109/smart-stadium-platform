"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, AlertTriangle, Activity, Map as MapIcon, Zap, 
  Coffee, ShowerHead, TrendingUp, Radio, Clock
} from 'lucide-react';
import { useStadiumStore, type POIData } from '@/store/useStadiumStore';
import { socket } from '@/lib/socket';

interface ExtendedPOI extends POIData {
  name?: string;
  type?: string;
  zone?: string;
  emoji?: string;
}

export default function AdminDashboard() {
  const { zones, pois, updateZone, updatePoi } = useStadiumStore();
  const [mounted, setMounted] = useState(false);
  const [isTriggering, setIsTriggering] = useState<string | null>(null);
  const [eventLog, setEventLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setEventLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 15));
  };

  useEffect(() => {
    setMounted(true);
    socket.emit('subscribeAdmin');

    // Fetch initial state
    fetch('http://localhost:4001/api/state/zones').then(r => r.json()).then(data => {
      for (const [key, val] of Object.entries(data)) updateZone(key, val as any);
    }).catch(() => {});
    
    fetch('http://localhost:4001/api/state/pois').then(r => r.json()).then(data => {
      for (const [key, val] of Object.entries(data)) updatePoi(key, val as POIData);
    }).catch(() => {});

    socket.on('stadium_updates', (data: any) => {
      if (data.type === 'crowd:update' || data.type === 'emergency:surge') {
        updateZone(data.zone, data.data);
        if (data.type === 'emergency:surge') {
          addLog(`🚨 SURGE: ${data.zone.replace('_', ' ').toUpperCase()} → ${data.data.density}%`);
        }
      }
      if (data.type === 'queue:update') {
        updatePoi(data.poi, data.data);
      }
    });

    return () => { socket.off('stadium_updates'); };
  }, [updateZone, updatePoi]);

  if (!mounted) return null;

  // Calculate global stats
  const zoneEntries = Object.entries(zones);
  const totalDensity = Object.values(zones).reduce((acc, z) => acc + z.density, 0);
  const avgDensity = zoneEntries.length ? Math.round(totalDensity / zoneEntries.length) : 0;
  const congestedZones = Object.values(zones).filter(z => z.status === 'CONGESTED').length;
  const poiEntries = Object.entries(pois).map(([id, data]) => ({ id, ...(data as ExtendedPOI) }));
  const avgWait = poiEntries.length ? Math.round(poiEntries.reduce((a, p) => a + p.waitMin, 0) / poiEntries.length) : 0;

  const triggerAction = async (endpoint: string, body: any, label: string) => {
    setIsTriggering(label);
    addLog(`▶️ Triggered: ${label}`);
    try {
      await fetch(`http://localhost:4001${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      addLog(`✅ ${label} executed successfully`);
    } catch (e) {
      addLog(`❌ ${label} failed`);
    }
    setTimeout(() => setIsTriggering(null), 800);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Live Operations</h2>
          <p className="text-slate-400 text-sm">Real-time stadium state and simulation controls.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            System Live
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: "Avg Crowd Density", value: `${avgDensity}%`, icon: Users, color: "text-blue-400" },
          { title: "Congested Zones", value: `${congestedZones} / ${zoneEntries.length}`, icon: AlertTriangle, color: "text-red-400" },
          { title: "Avg Queue Wait", value: `${avgWait} min`, icon: Clock, color: "text-amber-400" },
          { title: "Active POIs", value: `${poiEntries.length}`, icon: Radio, color: "text-emerald-400" },
        ].map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex flex-col gap-3 relative overflow-hidden group hover:border-white/20 transition-colors"
          >
            <div className={`absolute top-0 right-0 p-4 opacity-40 group-hover:scale-110 transition-transform ${kpi.color}`}>
              <kpi.icon size={24} />
            </div>
            <p className="text-sm font-medium text-slate-400">{kpi.title}</p>
            <p className="text-3xl font-bold text-white tabular-nums">{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Main Layout: Heatmap + Simulation + Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Heatmap Area */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MapIcon size={18} className="text-slate-400"/>
            Stadium Heatmap
          </h3>
          <div className="h-[420px] rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md p-6 relative overflow-hidden flex items-center justify-center">
            <div className="grid grid-cols-2 gap-4 w-full max-w-lg aspect-square">
              {(['zone_A', 'zone_B', 'zone_C', 'zone_D'] as const).map((zoneId, i) => {
                const zone = zones[zoneId];
                const density = zone?.density || 0;
                const directionLabels = ['North Stand', 'East Stand', 'South Stand', 'West Stand'];
                
                let colorClass = 'bg-slate-800/50 border-slate-700';
                if (density > 80) colorClass = 'bg-red-500/20 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.3)]';
                else if (density > 60) colorClass = 'bg-amber-500/20 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]';
                else if (density > 0) colorClass = 'bg-emerald-500/20 border-emerald-500/50';

                return (
                  <motion.div
                    key={zoneId}
                    layout
                    className={`rounded-xl border-2 flex flex-col items-center justify-center p-4 transition-all duration-500 ${colorClass}`}
                  >
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider">{directionLabels[i]}</span>
                    <span className="text-3xl font-black text-white/90 tabular-nums">{density}%</span>
                    <span className={`text-[10px] uppercase tracking-wider mt-1 font-semibold ${density > 80 ? 'text-red-400' : density > 60 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {zone?.status || 'OFFLINE'}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Live Queue Status */}
          <h3 className="text-lg font-semibold flex items-center gap-2 pt-2">
            <Coffee size={18} className="text-slate-400"/>
            Live Queue Status
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {poiEntries.map((poi) => (
              <div key={poi.id} className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{poi.emoji || '📍'}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{poi.name || poi.id}</p>
                    <p className="text-[10px] text-slate-500">{(poi.zone || '').replace('_', ' ').toUpperCase()} · {poi.queueLength} people</p>
                  </div>
                </div>
                <div className={`text-lg font-bold tabular-nums ${poi.waitMin > 15 ? 'text-red-400' : poi.waitMin > 8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {poi.waitMin}<span className="text-xs font-normal text-slate-500"> min</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Simulation + Event Log */}
        <div className="space-y-4">
          <div id="simulation" className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Zap size={18} className="text-slate-400"/>
              Simulation Panel
            </h3>
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-4">
              <p className="text-xs text-slate-500">Trigger events to demonstrate system responsiveness.</p>
              
              <div className="space-y-2.5">
                {[
                  { label: 'Food Rush (Zone A)', desc: 'Surge crowd at food stalls', color: 'red', endpoint: '/api/simulate/surge', body: { zone: 'zone_A' }, icon: AlertTriangle },
                  { label: 'Food Rush (Zone C)', desc: 'Surge crowd at south gate', color: 'orange', endpoint: '/api/simulate/surge', body: { zone: 'zone_C' }, icon: AlertTriangle },
                  { label: 'Innings Break', desc: 'Global congestion spike', color: 'blue', endpoint: '/api/simulate/innings-break', body: {}, icon: Users },
                ].map((action) => {
                  const colorMap: Record<string, string> = {
                    red: 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-200',
                    orange: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-200',
                    blue: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-blue-200',
                  };
                  const iconColor: Record<string, string> = {
                    red: 'text-red-400', orange: 'text-amber-400', blue: 'text-blue-400',
                  };
                  return (
                    <button 
                      key={action.label}
                      onClick={() => triggerAction(action.endpoint, action.body, action.label)}
                      disabled={isTriggering !== null}
                      className={`w-full flex items-center justify-between px-4 py-3 border rounded-xl transition-all group disabled:opacity-50 ${colorMap[action.color]}`}
                    >
                      <div className="text-left">
                        <div className="text-sm font-medium">{action.label}</div>
                        <div className="text-[10px] opacity-60">{isTriggering === action.label ? 'Triggering...' : action.desc}</div>
                      </div>
                      <action.icon size={16} className={iconColor[action.color]} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Event Log */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity size={18} className="text-slate-400"/>
              Event Log
            </h3>
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 max-h-[300px] overflow-y-auto space-y-1.5">
              {eventLog.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-4">Trigger a simulation to see events here</p>
              ) : (
                eventLog.map((log, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-[11px] text-slate-400 font-mono leading-relaxed"
                  >
                    {log}
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
