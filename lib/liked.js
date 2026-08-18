// Client-side persistence for liked songs and user playlists (localStorage).

const LIKED_KEY = 'syncroom_liked_v1'
const PLAYLISTS_KEY = 'syncroom_playlists_v1'

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const data = JSON.parse(raw)
    return data == null ? fallback : data
  } catch (e) {
    return fallback
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    /* ignore */
  }
  emit()
}

// ---------------- liked songs ----------------

export function getLikedSongs() {
  return read(LIKED_KEY, [])
}

export function isLiked(videoId) {
  if (!videoId) return false
  return getLikedSongs().some((t) => t.videoId === videoId)
}

export function toggleLiked(track) {
  const list = getLikedSongs()
  const idx = list.findIndex((t) => t.videoId === track.videoId)
  if (idx >= 0) {
    list.splice(idx, 1)
    write(LIKED_KEY, list)
    return false
  }
  list.unshift({
    videoId: track.videoId,
    title: track.title || '',
    artist: track.artist || '',
    thumbnail: track.thumbnail || '',
    duration: track.duration || '',
  })
  write(LIKED_KEY, list)
  return true
}

// ---------------- user playlists ----------------

export function getPlaylists() {
  return read(PLAYLISTS_KEY, [])
}

export function getPlaylist(id) {
  return getPlaylists().find((p) => p.id === id) || null
}

function newId() {
  return 'pl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function createPlaylist({ title = 'Playlist Baru', cover = '' }) {
  const playlists = getPlaylists()
  const playlist = {
    id: newId(),
    title: title || 'Playlist Baru',
    cover: cover || '',
    tracks: [],
    createdAt: Date.now(),
  }
  playlists.unshift(playlist)
  write(PLAYLISTS_KEY, playlists)
  return playlist
}

export function importToPlaylist(playlistId, tracks, cover) {
  const playlists = getPlaylists()
  if (playlistId === '__new__') {
    const created = createPlaylist({ title: 'Playlist Baru', cover })
    created.tracks = (tracks || []).filter((t) => t && t.videoId)
    const list = getPlaylists()
    const cidx = list.findIndex((p) => p.id === created.id)
    if (cidx >= 0) list[cidx].tracks = created.tracks
    write(PLAYLISTS_KEY, list)
    return created
  }
  const idx = playlists.findIndex((p) => p.id === playlistId)
  if (idx < 0) return null
  const existing = new Set(playlists[idx].tracks.map((t) => t.videoId))
  const fresh = (tracks || []).filter((t) => t && t.videoId && !existing.has(t.videoId))
  if (fresh.length) {
    playlists[idx].tracks = playlists[idx].tracks.concat(fresh)
  }
  if (cover && !playlists[idx].cover) playlists[idx].cover = cover
  write(PLAYLISTS_KEY, playlists)
  return playlists[idx]
}

export function addToPlaylist(playlistId, track) {
  const playlists = getPlaylists()
  const idx = playlists.findIndex((p) => p.id === playlistId)
  if (idx < 0) return null
  if (playlists[idx].tracks.some((t) => t.videoId === track.videoId)) {
    return playlists[idx]
  }
  playlists[idx].tracks.push({
    videoId: track.videoId,
    title: track.title || '',
    artist: track.artist || '',
    thumbnail: track.thumbnail || '',
    duration: track.duration || '',
  })
  write(PLAYLISTS_KEY, playlists)
  return playlists[idx]
}

export function removeFromPlaylist(playlistId, index) {
  const playlists = getPlaylists()
  const idx = playlists.findIndex((p) => p.id === playlistId)
  if (idx < 0) return
  playlists[idx].tracks.splice(index, 1)
  write(PLAYLISTS_KEY, playlists)
}

export function deletePlaylist(playlistId) {
  write(
    PLAYLISTS_KEY,
    getPlaylists().filter((p) => p.id !== playlistId)
  )
}

export function renamePlaylist(playlistId, title) {
  const playlists = getPlaylists()
  const p = playlists.find((x) => x.id === playlistId)
  if (!p) return
  p.title = title
  write(PLAYLISTS_KEY, playlists)
}

// ---------------- subscription ----------------

const listeners = new Set()

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function emit() {
  listeners.forEach((fn) => {
    try {
      fn()
    } catch (e) {
      /* ignore */
    }
  })
}
