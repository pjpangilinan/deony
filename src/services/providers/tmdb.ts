import { MediaProvider, MediaResult } from './types';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

class RateLimiter {
  private queue: Array<() => void> = [];
  private processing = false;
  private lastRequestTime = 0;
  private minDelayMs = 250; // Max ~4 requests per second

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const now = Date.now();
          const timeToWait = Math.max(0, this.lastRequestTime + this.minDelayMs - now);
          if (timeToWait > 0) {
            await new Promise(r => setTimeout(r, timeToWait));
          }
          this.lastRequestTime = Date.now();
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing) return;
    this.processing = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) await task();
    }
    this.processing = false;
  }
}

const limiter = new RateLimiter();

async function fetchWithRateLimit(url: string): Promise<any> {
  return limiter.enqueue(async () => {
    const res = await fetch(url, {
      headers: {
        accept: 'application/json',
        ...(TMDB_API_KEY ? { Authorization: `Bearer ${TMDB_API_KEY}` } : {})
      }
    });
    if (!res.ok) {
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 1000));
        return fetchWithRateLimit(url);
      }
      throw new Error(`TMDB API Error: ${res.status}`);
    }
    return res.json();
  });
}

export const tmdbProvider: MediaProvider = {
  name: 'TMDB',
  async search(query: string): Promise<MediaResult[]> {
    if (!query) return [];
    const searchUrl = new URL(`${TMDB_BASE_URL}/search/multi`);
    searchUrl.searchParams.append('query', query);
    
    if (import.meta.env.VITE_TMDB_API_KEY_QUERY) {
      searchUrl.searchParams.append('api_key', import.meta.env.VITE_TMDB_API_KEY_QUERY);
    }
    
    const data = await fetchWithRateLimit(searchUrl.toString());
    
    return (data.results || [])
      .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
      .map((item: any): MediaResult => ({
        id: `tmdb-${item.media_type}-${item.id}`,
        type: item.media_type === 'movie' ? 'movie' : 'tv',
        title: item.title || item.name,
        description: item.overview,
        imageUrl: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : undefined,
        year: (item.release_date || item.first_air_date || '').substring(0, 4),
        provider: 'TMDB',
        providerId: String(item.id),
      }));
  },
  
  async resolve(id: string): Promise<MediaResult | null> {
    const [provider, type, tmdbId] = id.split('-');
    if (provider !== 'tmdb' || !tmdbId || !type) return null;
    
    const url = `${TMDB_BASE_URL}/${type}/${tmdbId}`;
    try {
      const item = await fetchWithRateLimit(url);
      return {
        id,
        type: type as 'movie' | 'tv',
        title: item.title || item.name,
        description: item.overview,
        imageUrl: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : undefined,
        year: (item.release_date || item.first_air_date || '').substring(0, 4),
        provider: 'TMDB',
        providerId: String(item.id),
      };
    } catch (e) {
      return null;
    }
  }
};
