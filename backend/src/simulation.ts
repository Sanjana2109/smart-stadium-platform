import { redis, redisPub } from './redis';

// Fake Zones for the Hackathon Demo
const ZONES = ['zone_A', 'zone_B', 'zone_C', 'zone_D'];
const POIS = [
  { id: 'poi_food_1', name: 'North Stand Bites', type: 'FOOD', zone: 'zone_A', emoji: '🍔' },
  { id: 'poi_food_2', name: 'East Wing Café', type: 'FOOD', zone: 'zone_B', emoji: '☕' },
  { id: 'poi_food_3', name: 'South Gate Grill', type: 'FOOD', zone: 'zone_C', emoji: '🌮' },
  { id: 'poi_washroom_1', name: 'North Restroom', type: 'WASHROOM', zone: 'zone_A', emoji: '🚻' },
  { id: 'poi_washroom_2', name: 'East Restroom', type: 'WASHROOM', zone: 'zone_B', emoji: '🚻' },
  { id: 'poi_merch_1', name: 'Fan Store', type: 'MERCH', zone: 'zone_C', emoji: '🏪' },
];

export const startSimulationEngine = () => {
  console.log('[Simulation] Engine started...');

  // Update Crowd Density every 3 seconds
  setInterval(async () => {
    for (const zone of ZONES) {
      const baseDensity = Math.floor(Math.random() * 30) + 40; // 40-70% base
      const density = baseDensity + (Math.random() > 0.8 ? 20 : 0); // occasional spikes
      
      const status = density > 80 ? 'CONGESTED' : (density > 60 ? 'MODERATE' : 'CLEAR');

      const data = { density, status, timestamp: Date.now() };
      
      // Save state to Redis Hash
      await redis.hset('stadium:zones', zone, JSON.stringify(data));
      
      // Publish event for WebSockets
      await redisPub.publish('stadium_updates', JSON.stringify({
        type: 'crowd:update',
        zone,
        data
      }));
    }
  }, 3000);

  // Update POI Queue Times every 5 seconds
  setInterval(async () => {
    for (const poi of POIS) {
      const queueLength = Math.floor(Math.random() * 50);
      const waitMin = Math.ceil(queueLength * 0.5);

      const data = { 
        queueLength, 
        waitMin, 
        name: poi.name,
        type: poi.type,
        zone: poi.zone,
        emoji: poi.emoji,
        timestamp: Date.now() 
      };

      await redis.hset('stadium:pois', poi.id, JSON.stringify(data));

      await redisPub.publish('stadium_updates', JSON.stringify({
        type: 'queue:update',
        poi: poi.id,
        data
      }));
    }
  }, 5000);
};

// Expose a manual trigger for the Admin Dashboard
export const triggerSurge = async (zone: string, targetDensity: number) => {
  const data = { density: targetDensity, status: 'CONGESTED', timestamp: Date.now() };
  await redis.hset('stadium:zones', zone, JSON.stringify(data));
  await redisPub.publish('stadium_updates', JSON.stringify({
    type: 'emergency:surge',
    zone,
    data
  }));
};
