import 'server-only'
import type { RateLimitConfig } from './evolution-api/types';

interface TimestampEntry {
  timestamp: number;
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  messagesPerMinute: 5,
  delayBetweenMs: 3000,
  maxBurst: 3,
};

const BURST_WINDOW_MS = 10000;
const BASE_BACKOFF_MS = 30000;
const MAX_BACKOFF_MS = 15 * 60 * 1000;
const CLEAN_WINDOW_MS = 10 * 60 * 1000;

export class RateLimiter {
  private static windows: Map<string, TimestampEntry[]> = new Map();
  private static lastSendTime: Map<string, number> = new Map();
  private static backoffUntil: Map<string, number> = new Map();
  private static consecutive429: Map<string, number> = new Map();
  private static lastCleanSend: Map<string, number> = new Map();

  static async waitIfNeeded(
    key: string,
    config: RateLimitConfig = DEFAULT_RATE_LIMIT
  ): Promise<void> {
    const now = Date.now();

    const lastClean = RateLimiter.lastCleanSend.get(key) || 0;
    if (now - lastClean > CLEAN_WINDOW_MS) {
      RateLimiter.consecutive429.delete(key);
    }

    const backoffUntil = RateLimiter.backoffUntil.get(key) || 0;
    if (now < backoffUntil) {
      const waitTime = backoffUntil - now;
      console.log(`[RateLimiter] Backing off for ${waitTime}ms for ${key} (consecutive 429s: ${RateLimiter.consecutive429.get(key) || 0})`);
      await RateLimiter.sleep(waitTime);
    }

    const windowMs = 60000;

    let entries = RateLimiter.windows.get(key) || [];

    entries = entries.filter((e) => now - e.timestamp < windowMs);

    while (entries.length >= config.messagesPerMinute) {
      const oldest = entries[0];
      const waitTime = windowMs - (now - oldest.timestamp) + 100;
      console.log(`[RateLimiter] Rate limit hit for ${key}, waiting ${waitTime}ms`);
      await RateLimiter.sleep(waitTime);
      entries = entries.filter((e) => Date.now() - e.timestamp < windowMs);
    }

    const burstWindow = entries.filter(
      (e) => Date.now() - e.timestamp < BURST_WINDOW_MS
    );
    if (burstWindow.length >= config.maxBurst) {
      const oldestBurst = burstWindow[0];
      const waitTime = BURST_WINDOW_MS - (Date.now() - oldestBurst.timestamp) + 100;
      console.log(`[RateLimiter] Burst limit hit for ${key}, waiting ${waitTime}ms`);
      await RateLimiter.sleep(waitTime);
    }

    const lastSend = RateLimiter.lastSendTime.get(key) || 0;
    const elapsed = Date.now() - lastSend;
    if (elapsed < config.delayBetweenMs) {
      const delayNeeded = config.delayBetweenMs - elapsed;
      const jitter = Math.floor(Math.random() * 1000);
      console.log(`[RateLimiter] Delaying ${delayNeeded + jitter}ms for ${key}`);
      await RateLimiter.sleep(delayNeeded + jitter);
    }
  }

  static recordSend(key: string): void {
    const now = Date.now();
    const entries = RateLimiter.windows.get(key) || [];
    entries.push({ timestamp: now });
    RateLimiter.windows.set(key, entries);
    RateLimiter.lastSendTime.set(key, now);

    const lastClean = RateLimiter.lastCleanSend.get(key) || 0;
    if (now - lastClean > CLEAN_WINDOW_MS) {
      RateLimiter.consecutive429.delete(key);
    }
    RateLimiter.lastCleanSend.set(key, now);
  }

  static async backoff(key: string, durationMs: number = BASE_BACKOFF_MS): Promise<void> {
    const current = RateLimiter.consecutive429.get(key) || 0;
    const next = current + 1;
    RateLimiter.consecutive429.set(key, next);

    const escalatedMs = Math.min(BASE_BACKOFF_MS * Math.pow(2, next - 1), MAX_BACKOFF_MS);
    const until = Date.now() + escalatedMs;
    RateLimiter.backoffUntil.set(key, until);
    console.log(`[RateLimiter] 429 backoff #${next} for ${key}: ${escalatedMs}ms`);
  }

  static reset(key: string): void {
    RateLimiter.windows.delete(key);
    RateLimiter.lastSendTime.delete(key);
    RateLimiter.backoffUntil.delete(key);
    RateLimiter.consecutive429.delete(key);
    RateLimiter.lastCleanSend.delete(key);
  }

  static getStats(key: string): {
    sentInLastMinute: number;
    sentInLastBurst: number;
    isBackedOff: boolean;
    backoffRemainingMs: number;
    consecutive429: number;
  } {
    const now = Date.now();
    const entries = RateLimiter.windows.get(key) || [];
    const windowMs = 60000;

    const sentInLastMinute = entries.filter(
      (e) => now - e.timestamp < windowMs
    ).length;

    const sentInLastBurst = entries.filter(
      (e) => now - e.timestamp < BURST_WINDOW_MS
    ).length;

    const backoffUntil = RateLimiter.backoffUntil.get(key) || 0;
    const isBackedOff = now < backoffUntil;
    const consecutive429 = RateLimiter.consecutive429.get(key) || 0;

    return {
      sentInLastMinute,
      sentInLastBurst,
      isBackedOff,
      backoffRemainingMs: isBackedOff ? backoffUntil - now : 0,
      consecutive429,
    };
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}