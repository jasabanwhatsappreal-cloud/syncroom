export const ROOM_CODE_LENGTH = 6

// Ambiguous chars removed (O, 0, I, 1)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const UID_KEY = 'syncroom_uid'
const USERNAME_KEY = 'syncroom_username'
const TAB_KEY = 'syncroom_tab'

export function generateRoomCode() {
  let code = ''
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

export function sanitizeRoomCode(value = '') {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_LENGTH)
}

export function isValidRoomCode(code = '') {
  return /^[A-Z0-9]{6}$/.test(code)
}

export function getOrCreateUserId() {
  let uid = null
  try {
    uid = localStorage.getItem(UID_KEY)
  } catch (e) {
    /* ignore */
  }
  if (!uid) {
    uid = 'u_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
    try {
      localStorage.setItem(UID_KEY, uid)
    } catch (e) {
      /* ignore */
    }
  }
  return uid
}

export function getTabToken() {
  let token = null
  try {
    token = sessionStorage.getItem(TAB_KEY)
  } catch (e) {
    /* ignore */
  }
  if (!token) {
    token = 't_' + Math.random().toString(36).slice(2, 8)
    try {
      sessionStorage.setItem(TAB_KEY, token)
    } catch (e) {
      /* ignore */
    }
  }
  return token
}

export function getPresenceId() {
  return `${getOrCreateUserId()}:${getTabToken()}`
}

export function getStoredUsername() {
  try {
    return localStorage.getItem(USERNAME_KEY) || ''
  } catch (e) {
    return ''
  }
}

export function storeUsername(username) {
  try {
    localStorage.setItem(USERNAME_KEY, username)
  } catch (e) {
    /* ignore */
  }
}

export function sanitizeUsername(value = '') {
  return value.trim().slice(0, 24)
}

export function getRoomUrl(code) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '')
  return `${base}/room/${code}`
}

const ROOM_STATE_PREFIX = 'syncroom_room_'

// Persist a lightweight snapshot of the room (playlist + current track) in
// localStorage so the song list survives a page refresh even when the Supabase
// rooms table is unavailable. Each device keeps the last state it saw; the
// authoritative host/broadcast state reconciles it afterwards.
export function saveCachedRoomState(code, state) {
  try {
    if (!code || !state || typeof window === 'undefined') return
    const playback = state.playback || {}
    const payload = {
      savedAt: Date.now(),
      hostId: state.hostId || null,
      allowEveryoneControl: Boolean(state.allowEveryoneControl),
      currentTrack: state.currentTrack || null,
      playlist: Array.isArray(state.playlist) ? state.playlist : [],
      playback: {
        playing: Boolean(playback.playing),
        position: Number(playback.position) || 0,
        serverTime: playback.serverTime || null,
      },
    }
    window.localStorage.setItem(`${ROOM_STATE_PREFIX}${code}`, JSON.stringify(payload))
  } catch (e) {
    /* ignore */
  }
}

export function loadCachedRoomState(code) {
  try {
    if (!code || typeof window === 'undefined') return null
    const raw = window.localStorage.getItem(`${ROOM_STATE_PREFIX}${code}`)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || !Array.isArray(data.playlist)) return null
    return data
  } catch (e) {
    return null
  }
}