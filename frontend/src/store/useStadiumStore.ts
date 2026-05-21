import { create } from 'zustand';

export interface ZoneData {
  density: number;
  status: 'CLEAR' | 'MODERATE' | 'CONGESTED';
  timestamp: number;
}

export interface POIData {
  queueLength: number;
  waitMin: number;
  timestamp: number;
}

interface StadiumState {
  zones: Record<string, ZoneData>;
  pois: Record<string, POIData>;
  alerts: string[];
  updateZone: (zoneId: string, data: ZoneData) => void;
  updatePoi: (poiId: string, data: POIData) => void;
  addAlert: (alert: string) => void;
}

export const useStadiumStore = create<StadiumState>((set) => ({
  zones: {},
  pois: {},
  alerts: [],
  
  updateZone: (zoneId, data) => set((state) => ({
    zones: { ...state.zones, [zoneId]: data }
  })),

  updatePoi: (poiId, data) => set((state) => ({
    pois: { ...state.pois, [poiId]: data }
  })),

  addAlert: (alert) => set((state) => ({
    alerts: [alert, ...state.alerts].slice(0, 5) // Keep last 5 alerts
  }))
}));
