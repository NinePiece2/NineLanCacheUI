// Client-side cache for Steam header image availability
// Stores which images exist (200) and which don't (404) to avoid repeated failed requests

type ImageStatus = 'exists' | 'missing' | 'unknown';

class ImageCache {
  private cache: Map<string, ImageStatus>;
  private pendingChecks: Map<string, Promise<ImageStatus>>;
  private readonly STORAGE_KEY = 'steam_image_cache';
  private readonly MAX_CACHE_SIZE = 1000; // Prevent unbounded growth
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;

  constructor() {
    this.cache = new Map();
    this.pendingChecks = new Map();
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, { status: ImageStatus; timestamp: number }>;
        const now = Date.now();
        
        // Load cached entries that haven't expired
        Object.entries(parsed).forEach(([url, data]) => {
          if (data.timestamp && (now - data.timestamp < this.CACHE_DURATION)) {
            this.cache.set(url, data.status);
          }
        });
      }
    } catch {
      console.warn('Failed to load image cache from storage');
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    
    try {
      const now = Date.now();
      const toStore: Record<string, { status: ImageStatus; timestamp: number }> = {};
      
      // Only store the most recent entries up to MAX_CACHE_SIZE
      const entries = Array.from(this.cache.entries()).slice(-this.MAX_CACHE_SIZE);
      
      entries.forEach(([url, status]) => {
        toStore[url] = { status, timestamp: now };
      });
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(toStore));
    } catch (error) {
      console.warn('Failed to save image cache to storage:', error);
    }
  }

  async checkImageExists(url: string): Promise<ImageStatus> {
    const cached = this.cache.get(url);
    if (cached && cached !== 'unknown') {
      return cached;
    }

    const pending = this.pendingChecks.get(url);
    if (pending) {
      return pending;
    }

    const checkPromise = this.performCheck(url);
    this.pendingChecks.set(url, checkPromise);

    try {
      const result = await checkPromise;
      this.cache.set(url, result);
      this.pendingChecks.delete(url);
      
      // Periodically save to storage (debounced via cache size check)
      if (this.cache.size % 10 === 0) {
        this.saveToStorage();
      }
      
      return result;
    } catch {
      this.pendingChecks.delete(url);
      return 'unknown';
    }
  }

  private async performCheck(url: string): Promise<ImageStatus> {
    return new Promise((resolve) => {
      const img = new Image();
      
      const timeout = setTimeout(() => {
        img.src = '';
        resolve('unknown');
      }, 5000);

      img.onload = () => {
        clearTimeout(timeout);
        resolve('exists');
      };

      img.onerror = () => {
        clearTimeout(timeout);
        resolve('missing');
      };

      img.src = url;
    });
  }

  getStatus(url: string): ImageStatus {
    return this.cache.get(url) || 'unknown';
  }

  setStatus(url: string, status: ImageStatus) {
    this.cache.set(url, status);
    
    if (this.cache.size % 10 === 0) {
      this.saveToStorage();
    }
  }

  clear() {
    this.cache.clear();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }
}

export const imageCache = new ImageCache();
