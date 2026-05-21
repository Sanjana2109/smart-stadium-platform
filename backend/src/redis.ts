import { Redis } from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// We'll use ioredis to connect to Upstash Redis.
// Upstash provides a REDIS_URL which usually looks like:
// redis://default:password@endpoint:port
const REDIS_URL = process.env.UPSTASH_REDIS_URL || 'redis://localhost:6379';

// Main client for reading/writing state
export const redis = new Redis(REDIS_URL);

// Pub/Sub requires separate client instances
export const redisPub = new Redis(REDIS_URL);
export const redisSub = new Redis(REDIS_URL);

redis.on('connect', () => console.log('[Redis] Connected to state store'));
redis.on('error', (err) => console.error('[Redis] State store error:', err));
