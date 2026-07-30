import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Using fetch-based Upstash Redis client (works without native bindings)
@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private baseUrl: string;
  private token: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('UPSTASH_REDIS_URL') || '';
    this.token = this.configService.get<string>('UPSTASH_REDIS_TOKEN') || '';
  }

  private async execute(command: any[]): Promise<any> {
    if (!this.baseUrl || !this.token) {
      this.logger.warn('Redis not configured, skipping cache operation');
      return null;
    }
    const res = await fetch(`${this.baseUrl}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });
    const data = await res.json();
    return data.result;
  }

  async get(key: string): Promise<string | null> {
    return this.execute(['GET', key]);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.execute(['SET', key, value, 'EX', ttlSeconds]);
    } else {
      await this.execute(['SET', key, value]);
    }
  }

  async del(key: string): Promise<void> {
    await this.execute(['DEL', key]);
  }

  async setJson(key: string, value: object, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  // Cache helper
  async remember<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
    const cached = await this.getJson<T>(key);
    if (cached) return cached;
    const result = await fn();
    await this.setJson(key, result as object, ttl);
    return result;
  }
}
