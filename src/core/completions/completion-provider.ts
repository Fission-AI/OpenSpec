import { getActiveChangeIds, getSpecIds } from '../../utils/item-discovery.js';

/**
 * Cache entry for completion data
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Provides dynamic completion suggestions for OpenSpec items (changes and specs).
 * Implements a 2-second cache to avoid excessive file system operations during
 * tab completion.
 */
export class CompletionProvider {
  private readonly cacheTTL: number;
  private changeCache: CacheEntry<string[]> | null = null;
  private specCache: CacheEntry<string[]> | null = null;

  /**
   * Creates a new completion provider
   *
   * @param cacheTTLMs - Cache time-to-live in milliseconds (default: 2000ms)
   * @param projectRoot - Project root directory (default: process.cwd())
   */
  constructor(
    private readonly cacheTTLMs: number = 2000,
    private readonly projectRoot: string = process.cwd()
  ) {
    this.cacheTTL = cacheTTLMs;
  }

  /**
   * Get all active change IDs for completion
   *
   * @returns Array of change IDs
   */
  async getChangeIds(): Promise<string[]> {
    const now = Date.now();

    // Check if cache is valid
    if (this.changeCache && now - this.changeCache.timestamp < this.cacheTTL) {
      return this.changeCache.data;
    }

    // Fetch fresh data
    const changeIds = await getActiveChangeIds(this.projectRoot);

    // Update cache
    this.changeCache = {
      data: changeIds,
      timestamp: now,
    };

    return changeIds;
  }

  /**
   * Get all spec IDs for completion
   *
   * @returns Array of spec IDs
   */
  async getSpecIds(): Promise<string[]> {
    const now = Date.now();

    // Check if cache is valid
    if (this.specCache && now - this.specCache.timestamp < this.cacheTTL) {
      return this.specCache.data;
    }

    // Fetch fresh data
    const specIds = await getSpecIds(this.projectRoot);

    // Update cache
    this.specCache = {
      data: specIds,
      timestamp: now,
    };

    return specIds;
  }

  /**
   * Get both change and spec IDs for completion
   *
   * @returns Object with changeIds and specIds arrays
   */
  async getAllIds(): Promise<{ changeIds: string[]; specIds: string[] }> {
    const [changeIds, specIds] = await Promise.all([
      this.getChangeIds(),
      this.getSpecIds(),
    ]);

    return { changeIds, specIds };
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.changeCache = null;
    this.specCache = null;
  }

  /**
   * Get cache statistics for debugging
   *
   * @returns Cache status information
   */
  getCacheStats(): {
    changeCache: { valid: boolean; age?: number };
    specCache: { valid: boolean; age?: number };
  } {
    const now = Date.now();

    return {
      changeCache: {
        valid: this.changeCache !== null && now - this.changeCache.timestamp < this.cacheTTL,
        age: this.changeCache ? now - this.changeCache.timestamp : undefined,
      },
      specCache: {
        valid: this.specCache !== null && now - this.specCache.timestamp < this.cacheTTL,
        age: this.specCache ? now - this.specCache.timestamp : undefined,
      },
    };
  }
}
