// Server-only helper for calling the Drowify Music API.
// This module is only imported from route handlers (never bundled to the browser).

const DROWIFY_BASE = process.env.DROWIFY_API_BASE_URL || 'https://drowify-music.biz.id'

export function drowifyBase() {
  return DROWIFY_BASE
}

async function fetchDrowify(path, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    const res = await fetch(`${DROWIFY_BASE}${path}`, {
      ...options,
      signal: controller.signal,
    })
    if (!res.ok) {
      throw new Error(`Drowify responded ${res.status}`)
    }
    return await res.json()
  } finally {
    clearTimeout(timeout)
  }
}

export function drowifyGet(path) {
  return fetchDrowify(path)
}

export function drowifyPost(path, body) {
  return fetchDrowify(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function apiError(message) {
  return new Error(message)
}