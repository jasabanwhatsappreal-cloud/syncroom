// Client-side music helpers. These call the Next.js proxy routes
// (never hit the Drowify API directly from the browser).

const audioCache = new Map()
const audioInFlight = new Map()

async function request(url, options = {}) {
  const res = await fetch(url, options)
  let data = null
  try {
    data = await res.json()
  } catch (e) {
    data = null
  }
  if (!res.ok || (data && data.error)) {
    throw new Error((data && data.error) || `Request failed (${res.status})`)
  }
  return data
}

export function searchMusic(query, type = 'all') {
  return request(`/api/music/search?query=${encodeURIComponent(query)}&type=${type}`)
}

export function getArtist(id) {
  return request(`/api/music/artist?id=${encodeURIComponent(id)}`)
}

export function getAlbum(id) {
  return request(`/api/music/album?id=${encodeURIComponent(id)}`)
}

export function getLyrics(videoId, title = '', artist = '') {
  return request(
    `/api/music/lyrics?id=${encodeURIComponent(videoId)}&title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`
  )
}

export function getSuggestion(q) {
  return request(`/api/music/suggest?q=${encodeURIComponent(q)}`)
}

export function getAudio(videoId) {
  if (audioCache.has(videoId)) {
    return Promise.resolve(audioCache.get(videoId))
  }
  if (audioInFlight.has(videoId)) {
    return audioInFlight.get(videoId)
  }
  const promise = request('/api/music/audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId }),
  }).then((data) => {
    if (!data || !data.audioUrl) {
      throw new Error('Audio tidak tersedia.')
    }
    audioCache.set(videoId, data.audioUrl)
    return data.audioUrl
  })
  audioInFlight.set(videoId, promise)
  const cleanup = () => audioInFlight.delete(videoId)
  promise.then(cleanup, cleanup)
  return promise
}

export function clearAudioCache(videoId) {
  audioCache.delete(videoId)
}