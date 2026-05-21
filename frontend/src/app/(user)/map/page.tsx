"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Navigation2, Coffee, Sparkles, MapPin, Clock, 
  ShowerHead, ShoppingBag, Send, ArrowRight,
  AlertCircle, ChevronDown, Route, Timer, TrendingDown,
  Compass, Bell, X, Star, Zap
} from 'lucide-react';
import { useStadiumStore, type POIData } from '@/store/useStadiumStore';
import { socket } from '@/lib/socket';

type Tab = 'map' | 'food' | 'copilot';

interface ExtendedPOI extends POIData {
  name?: string;
  type?: string;
  zone?: string;
  emoji?: string;
}

const ZONE_META: Record<string, { label: string; direction: string; icon: string }> = {
  zone_A: { label: 'North Stand', direction: 'N', icon: '🏟️' },
  zone_B: { label: 'East Stand', direction: 'E', icon: '🏟️' },
  zone_C: { label: 'South Stand', direction: 'S', icon: '🏟️' },
  zone_D: { label: 'West Stand', direction: 'W', icon: '🏟️' },
};

export default function UserApp() {
  const { zones, pois, updateZone, updatePoi, alerts, addAlert } = useStadiumStore();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('map');
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai'; text: string}[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const currentZone = 'zone_A';

  const fetchInitialData = useCallback(async () => {
    try {
      const [zonesRes, poisRes] = await Promise.all([
        fetch('http://localhost:4001/api/state/zones').catch(() => null),
        fetch('http://localhost:4001/api/state/pois').catch(() => null),
      ]);
      if (zonesRes?.ok) {
        const data = await zonesRes.json();
        for (const [key, val] of Object.entries(data)) updateZone(key, val as any);
      }
      if (poisRes?.ok) {
        const data = await poisRes.json();
        for (const [key, val] of Object.entries(data)) updatePoi(key, val as POIData);
      }
    } catch (e) { console.error('Initial fetch failed:', e); }
  }, [updateZone, updatePoi]);

  useEffect(() => {
    setMounted(true);
    fetchInitialData();

    socket.on('stadium_updates', (data: any) => {
      if (data.type === 'crowd:update' || data.type === 'emergency:surge') {
        updateZone(data.zone, data.data);
        if (data.type === 'emergency:surge') {
          addAlert(`⚠️ Surge in ${ZONE_META[data.zone]?.label || data.zone}! Density at ${data.data.density}%`);
        }
      }
      if (data.type === 'queue:update') {
        updatePoi(data.poi, data.data);
      }
    });

    return () => { socket.off('stadium_updates'); };
  }, [updateZone, updatePoi, addAlert, fetchInitialData]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  const handleAskAI = async (text?: string) => {
    const question = text || prompt.trim();
    if (!question) return;
    setActiveTab('copilot');
    setChatMessages(prev => [...prev, { role: 'user', text: question }]);
    setPrompt("");
    setIsTyping(true);
    try {
      const res = await fetch('http://localhost:4001/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: question })
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'ai', text: data.reply || "I couldn't process that." }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'ai', text: "Connection error. Is the backend running?" }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!mounted) return null;

  const getDensityColor = (d: number) => {
    if (d > 80) return { bg: 'from-red-500/30 to-red-900/20', border: 'border-red-500/40', text: 'text-red-400', dot: 'bg-red-500', label: 'Crowded', ring: 'ring-red-500/30' };
    if (d > 60) return { bg: 'from-amber-500/30 to-amber-900/20', border: 'border-amber-500/40', text: 'text-amber-400', dot: 'bg-amber-500', label: 'Moderate', ring: 'ring-amber-500/30' };
    if (d > 0) return { bg: 'from-emerald-500/30 to-emerald-900/20', border: 'border-emerald-500/40', text: 'text-emerald-400', dot: 'bg-emerald-500', label: 'Clear', ring: 'ring-emerald-500/30' };
    return { bg: 'from-slate-700/30 to-slate-900/20', border: 'border-slate-600/40', text: 'text-slate-500', dot: 'bg-slate-600', label: 'Offline', ring: '' };
  };

  const getWaitBadge = (w: number) => {
    if (w <= 5) return { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Fast' };
    if (w <= 12) return { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Moderate' };
    return { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Slow' };
  };

  const allPois = Object.entries(pois).map(([id, data]) => ({ id, ...(data as ExtendedPOI) }));
  const foodPois = allPois.filter(p => p.type === 'FOOD').sort((a, b) => a.waitMin - b.waitMin);
  const washroomPois = allPois.filter(p => p.type === 'WASHROOM').sort((a, b) => a.waitMin - b.waitMin);
  const merchPois = allPois.filter(p => p.type === 'MERCH');
  
  // Find best recommendations
  const bestFood = foodPois[0];
  const bestWashroom = washroomPois[0];

  // Nearby POIs for selected zone
  const nearbyPois = selectedZone ? allPois.filter(p => p.zone === selectedZone) : [];

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <header className="px-4 pt-5 pb-3 flex items-center justify-between z-10 bg-black/30 backdrop-blur-md border-b border-white/5">
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
            Nexus Matchday
          </h1>
          <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
            <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span></span>
            <MapPin size={8} /> {ZONE_META[currentZone].label} · Live
          </p>
        </div>
        <button 
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
        >
          <Bell size={16} className="text-slate-400" />
          {alerts.length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[8px] font-bold text-white flex items-center justify-center">{alerts.length}</span>
          )}
        </button>
      </header>

      {/* Notification Drawer */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden z-20 border-b border-white/10 bg-black/60 backdrop-blur-xl"
          >
            <div className="p-3 space-y-2 max-h-40 overflow-y-auto">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Notifications</p>
                <button onClick={() => setShowNotifications(false)}><X size={12} className="text-slate-500" /></button>
              </div>
              {alerts.length === 0 ? (
                <p className="text-xs text-slate-600 py-2">No alerts yet</p>
              ) : (
                alerts.map((a, i) => (
                  <div key={i} className="text-xs text-slate-300 flex items-start gap-2 p-2 rounded-lg bg-white/5">
                    <AlertCircle size={12} className="text-red-400 shrink-0 mt-0.5" />
                    <span>{a}</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto relative">
        <AnimatePresence mode="wait">

          {/* ========== MAP TAB ========== */}
          {activeTab === 'map' && (
            <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
              
              {/* Zone Grid */}
              <div className="flex-1 p-4 flex items-center justify-center relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-teal-500/10 rounded-full animate-ping pointer-events-none opacity-50" />
                
                <div className="grid grid-cols-2 gap-2.5 w-full max-w-xs">
                  {Object.entries(ZONE_META).map(([zoneId, meta], i) => {
                    const density = zones[zoneId]?.density || 0;
                    const c = getDensityColor(density);
                    const isYou = zoneId === currentZone;
                    const isSelected = selectedZone === zoneId;

                    return (
                      <motion.button
                        key={zoneId}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.06 }}
                        onClick={() => setSelectedZone(isSelected ? null : zoneId)}
                        className={`rounded-2xl border bg-gradient-to-br ${c.bg} ${c.border} flex flex-col items-center justify-center p-4 relative overflow-hidden transition-all duration-300 ${isSelected ? `ring-2 ${c.ring} scale-[1.03]` : ''} ${isYou && !isSelected ? 'ring-1 ring-teal-400/40' : ''}`}
                      >
                        {isYou && (
                          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-teal-500/30 text-[7px] font-bold text-teal-300 uppercase tracking-widest">You</div>
                        )}
                        <span className="text-[9px] text-slate-400 uppercase tracking-widest">{meta.direction} · {meta.label.split(' ')[0]}</span>
                        <span className="text-3xl font-black text-white tabular-nums mt-1">{density}<span className="text-sm text-white/40">%</span></span>
                        <div className={`flex items-center gap-1 mt-1.5`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                          <span className={`text-[9px] font-semibold uppercase tracking-wider ${c.text}`}>{c.label}</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Zone Detail Drawer */}
              <AnimatePresence>
                {selectedZone && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-white/10"
                  >
                    <div className="p-4 bg-black/40 backdrop-blur-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-white">{ZONE_META[selectedZone]?.label} — Nearby</h3>
                        <button onClick={() => setSelectedZone(null)}><ChevronDown size={14} className="text-slate-500" /></button>
                      </div>
                      {nearbyPois.length === 0 ? (
                        <p className="text-xs text-slate-500">No facilities in this zone</p>
                      ) : (
                        <div className="space-y-2">
                          {nearbyPois.map(poi => {
                            const badge = getWaitBadge(poi.waitMin);
                            return (
                              <div key={poi.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-lg">{poi.emoji}</span>
                                  <div>
                                    <p className="text-xs font-medium text-white">{poi.name}</p>
                                    <p className="text-[9px] text-slate-500">{poi.queueLength} in queue</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-bold tabular-nums ${poi.waitMin > 15 ? 'text-red-400' : poi.waitMin > 8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                    {poi.waitMin}m
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold border ${badge.color}`}>{badge.label}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Smart Recommendations */}
              {!selectedZone && (
                <div className="px-4 pb-3 space-y-2">
                  {bestFood && (
                    <button 
                      onClick={() => handleAskAI(`What's the fastest food option right now? I'm at ${ZONE_META[currentZone].label}`)}
                      className="w-full p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/15 flex items-center gap-3 group hover:from-amber-500/15 transition-all text-left"
                    >
                      <span className="text-xl">{bestFood.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">Fastest food: {bestFood.name}</p>
                        <p className="text-[10px] text-slate-500">{bestFood.waitMin} min wait · {bestFood.queueLength} in line</p>
                      </div>
                      <ArrowRight size={12} className="text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}
                  {bestWashroom && (
                    <button
                      onClick={() => handleAskAI(`Which restroom has the shortest queue right now?`)}
                      className="w-full p-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/15 flex items-center gap-3 group hover:from-blue-500/15 transition-all text-left"
                    >
                      <span className="text-xl">{bestWashroom.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">Nearest restroom: {bestWashroom.name}</p>
                        <p className="text-[10px] text-slate-500">{bestWashroom.waitMin} min wait</p>
                      </div>
                      <ArrowRight size={12} className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ========== FOOD & QUEUES TAB ========== */}
          {activeTab === 'food' && (
            <motion.div key="food" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 space-y-4 pb-8">

              {/* Best picks banner */}
              {bestFood && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/20">
                    <Zap size={16} className="text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-emerald-300">Best pick right now</p>
                    <p className="text-[10px] text-slate-400">{bestFood.emoji} {bestFood.name} — only {bestFood.waitMin} min wait</p>
                  </div>
                </div>
              )}

              {/* Food Section */}
              <div>
                <h2 className="text-sm font-semibold text-white mb-0.5 flex items-center gap-2"><Coffee size={14} className="text-amber-400" /> Food & Drinks</h2>
                <p className="text-[10px] text-slate-600 mb-3">Live queue times · updates every 5s</p>
                {foodPois.length === 0 ? (
                  <div className="space-y-2.5">{[1,2,3].map(i => <div key={i} className="h-[72px] rounded-xl bg-white/5 animate-pulse" />)}</div>
                ) : (
                  <div className="space-y-2">
                    {foodPois.map((poi, i) => {
                      const badge = getWaitBadge(poi.waitMin);
                      const isTop = i === 0;
                      return (
                        <motion.div
                          key={poi.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${isTop ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'}`}
                        >
                          <span className="text-2xl">{poi.emoji || '🍔'}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-white truncate">{poi.name}</p>
                              {isTop && <span className="flex items-center gap-0.5 text-[8px] text-emerald-400 font-bold"><Star size={8} /> BEST</span>}
                            </div>
                            <p className="text-[10px] text-slate-500">{(poi.zone || '').replace('_', ' ').toUpperCase()} · {poi.queueLength} people</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-lg font-bold tabular-nums ${poi.waitMin > 15 ? 'text-red-400' : poi.waitMin > 8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {poi.waitMin}<span className="text-[9px] font-normal text-slate-600">m</span>
                            </p>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[7px] font-semibold border ${badge.color}`}>{badge.label}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Restrooms */}
              {washroomPois.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-white mb-0.5 flex items-center gap-2"><ShowerHead size={14} className="text-blue-400" /> Restrooms</h2>
                  <p className="text-[10px] text-slate-600 mb-3">Sorted by shortest wait</p>
                  <div className="space-y-2">
                    {washroomPois.map((poi, i) => {
                      const badge = getWaitBadge(poi.waitMin);
                      return (
                        <motion.div key={poi.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                          className={`p-3 rounded-xl border flex items-center gap-3 ${i === 0 ? 'bg-blue-500/5 border-blue-500/20' : 'bg-white/[0.03] border-white/10'}`}
                        >
                          <span className="text-2xl">{poi.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-white">{poi.name}</p>
                              {i === 0 && <span className="flex items-center gap-0.5 text-[8px] text-blue-400 font-bold"><TrendingDown size={8} /> SHORTEST</span>}
                            </div>
                            <p className="text-[10px] text-slate-500">{(poi.zone || '').replace('_', ' ').toUpperCase()}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-lg font-bold tabular-nums ${poi.waitMin > 15 ? 'text-red-400' : poi.waitMin > 8 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {poi.waitMin}<span className="text-[9px] font-normal text-slate-600">m</span>
                            </p>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[7px] font-semibold border ${badge.color}`}>{badge.label}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Merch */}
              {merchPois.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><ShoppingBag size={14} className="text-purple-400" /> Merchandise</h2>
                  <div className="space-y-2">
                    {merchPois.map(poi => (
                      <div key={poi.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-3">
                        <span className="text-2xl">{poi.emoji}</span>
                        <div className="flex-1"><p className="text-sm font-medium text-white">{poi.name}</p><p className="text-[10px] text-slate-500">{(poi.zone || '').replace('_', ' ').toUpperCase()}</p></div>
                        <p className={`text-lg font-bold tabular-nums ${poi.waitMin > 15 ? 'text-red-400' : poi.waitMin > 8 ? 'text-amber-400' : 'text-emerald-400'}`}>{poi.waitMin}<span className="text-[9px] font-normal text-slate-600">m</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Ask */}
              <button onClick={() => handleAskAI("I'm looking for vegan food with the shortest wait. What do you suggest?")}
                className="w-full p-3.5 rounded-xl bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-500/20 flex items-center gap-3 group hover:from-teal-500/15 transition-all"
              >
                <Sparkles size={16} className="text-teal-400" />
                <div className="text-left flex-1"><p className="text-xs font-medium text-white">Ask AI for recommendations</p><p className="text-[10px] text-slate-500">"Best food with shortest wait?"</p></div>
                <ArrowRight size={12} className="text-teal-400/60 group-hover:text-teal-400 transition-colors" />
              </button>
            </motion.div>
          )}

          {/* ========== AI COPILOT TAB ========== */}
          {activeTab === 'copilot' && (
            <motion.div key="copilot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-white/5">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/20"><Sparkles size={16} className="text-teal-400" /></div>
                  <div><h3 className="text-sm font-semibold text-white">Nexus AI Copilot</h3><p className="text-[9px] text-slate-500">Gemini · Live stadium data · Function calling</p></div>
                </div>

                {chatMessages.length === 0 && !isTyping && (
                  <div className="space-y-3 pt-2">
                    <div className="p-3.5 rounded-2xl bg-teal-950/40 border border-teal-500/10 text-sm text-teal-100/90 leading-relaxed">
                      👋 Hi! I'm your real-time stadium assistant. I can check live queue times, find the best routes, and give personalized recommendations. Try asking me something!
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { icon: '🍔', text: 'Which food stall has the shortest queue?' },
                        { icon: '🚻', text: 'Which restroom is least crowded right now?' },
                        { icon: '🗺️', text: 'Best route to avoid congestion after innings break?' },
                        { icon: '⏱️', text: 'How long is the wait at North Stand Bites?' },
                        { icon: '🌮', text: 'I want vegan food with under 5 min wait' },
                      ].map((s, i) => (
                        <motion.button key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.04 }}
                          onClick={() => handleAskAI(s.text)}
                          className="w-full p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-left text-xs text-slate-300 hover:bg-white/[0.06] hover:border-white/20 transition-all flex items-center gap-2.5"
                        >
                          <span className="text-sm">{s.icon}</span>{s.text}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {chatMessages.map((msg, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user' 
                        ? 'bg-teal-500/20 border border-teal-500/30 text-teal-50 rounded-br-md'
                        : 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-md'
                    }`}>{msg.text}</div>
                  </motion.div>
                ))}

                {isTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 w-fit">
                    <div className="flex gap-1">
                      {[0, 150, 300].map(d => <div key={d} className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                    </div>
                    <span className="text-[10px] text-slate-500">Analyzing live data...</span>
                  </motion.div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-3 bg-black/40 border-t border-white/10">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-1.5 pl-4 focus-within:ring-1 focus-within:ring-teal-500/50 transition-all">
                  <input value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAskAI()}
                    placeholder="Ask about food, routes, queues..." className="bg-transparent flex-1 outline-none text-sm text-white placeholder-slate-600" />
                  <button onClick={() => handleAskAI()} disabled={isTyping || !prompt.trim()}
                    className="p-2 rounded-xl bg-teal-500 text-white hover:bg-teal-400 transition-colors disabled:opacity-30"><Send size={14} /></button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Tab Bar */}
      <div className="bg-black/70 backdrop-blur-xl border-t border-white/10 flex justify-around items-center z-10 px-2 pt-2 pb-5">
        {([
          { id: 'map' as Tab, icon: Compass, label: 'Map' },
          { id: 'food' as Tab, icon: Coffee, label: 'Queues' },
          { id: 'copilot' as Tab, icon: Sparkles, label: 'AI Copilot' },
        ]).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 px-5 py-1.5 rounded-xl transition-all ${activeTab === tab.id ? 'text-teal-400 bg-teal-500/10' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <tab.icon size={18} />
            <span className="text-[8px] font-semibold uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
