// Server time offset estimation based on the Supabase server's Date header.
// All sync math uses an estimated "server time" so different devices stay aligned.

let offset = 0 // ms added to Date.now() to approximate server clock
let estimating = false

export async function estimateServerTimeOffset() {
  if (estimating) return offset
  estimating = true
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) return offset
    const t0 = Date.now()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    })
    clearTimeout(timer)
    const dateHeader = res.headers.get('date')
    if (dateHeader) {
      const serverMs = Date.parse(dateHeader)
      const rtt = Date.now() - t0
      // midpoint between send and receive approximates one-way latency
      offset = serverMs - (t0 + rtt / 2)
    }
  } catch (e) {
    offset = 0
  } finally {
    estimating = false
  }
  return offset
}

export function getServerTime() {
  return Date.now() + offset
}

// Given a recorded position + serverTime, compute where playback should be now.
export function computeTarget(position, serverTime) {
  const now = getServerTime()
  const elapsed = now - serverTime
  return Math.max(0, (position || 0) + (elapsed > 0 ? elapsed / 1000 : 0))
}

export function resetServerOffset() {
  offset = 0
  estimating = false
}