/**
 * Simple in-memory cache for API responses.
 * Data persists between page navigations within the same session.
 * Stale data is returned instantly while fresh data is fetched in the background.
 */

interface CacheEntry {
  data: any
  timestamp: number
}

const cache = new Map<string, CacheEntry>()

const DEFAULT_MAX_AGE = 30_000 // 30 seconds

/**
 * Fetch with client-side cache. Returns cached data immediately
 * and revalidates in the background.
 */
export async function cachedFetch(
  url: string,
  options?: { maxAge?: number; onUpdate?: (data: any) => void }
): Promise<any> {
  const maxAge = options?.maxAge ?? DEFAULT_MAX_AGE
  const entry = cache.get(url)

  // If cache is fresh, return it
  if (entry && Date.now() - entry.timestamp < maxAge) {
    return entry.data
  }

  // If cache is stale but exists, return it and revalidate in background
  if (entry) {
    fetch(url).then(async (res) => {
      if (res.ok) {
        const data = await res.json()
        cache.set(url, { data, timestamp: Date.now() })
        options?.onUpdate?.(data)
      }
    })
    return entry.data
  }

  // No cache, fetch fresh
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  const data = await res.json()
  cache.set(url, { data, timestamp: Date.now() })
  return data
}

/**
 * Invalidate cache for a specific URL or all URLs matching a prefix.
 */
export function invalidateCache(urlOrPrefix?: string) {
  if (!urlOrPrefix) {
    cache.clear()
    return
  }
  for (const key of cache.keys()) {
    if (key.startsWith(urlOrPrefix)) {
      cache.delete(key)
    }
  }
}
