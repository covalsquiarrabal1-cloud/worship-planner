import { NextResponse } from 'next/server'

/**
 * Create a JSON response with cache headers for short-lived data.
 * stale-while-revalidate: serves cached response while fetching fresh data in background.
 */
export function cachedJson(data: any, maxAge = 30, staleWhileRevalidate = 60) {
  const response = NextResponse.json(data)
  response.headers.set(
    'Cache-Control',
    `s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
  )
  return response
}
