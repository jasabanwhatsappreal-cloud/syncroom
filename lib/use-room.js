'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getSupabase, isSupabaseConfigured } from './supabase'
import {
  getOrCreateUserId,
  getTabToken,
  getStoredUsername,
  storeUsername,
  sanitizeUsername,
  saveCachedRoomState,
  loadCachedRoomState,
} from './room'
import { estimateServerTimeOffset, getServerTime, computeTarget } from './sync'
import { getAudio, clearAudioCache } from './music'

const TOLERANCE = 0.4
const SYNC_INTERVAL = 4000
const PERSIST_INTERVAL = 8000

function emptyRoomState(code, hostId) {
  return {
    roomCode: code,
    hostId,
    allowEveryoneControl: false,
    currentTrack: null,
    playlist: [],
    playback: { playing: false, position: 0, serverTime: null },
  }
}

export default function useRoom(code, create) {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [myId, setMyId] = useState(null)
  const [username, setUsername] = useState(() => getStoredUsername())
  const [roomState, setRoomState] = useState(null)
  const [members, setMembers] = useState([])
  const [connectionStatus, setConnectionStatus] = useState('connecting')

  // audio UI state
  const [isPlaying, setIsPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(1)
  const [audioError, setAudioError] = useState(false)
  const [needsUnlock, setNeedsUnlock] = useState(false)
  const [audioPreparing, setAudioPreparing] = useState(false)

  const uidRef = useRef(null)
  const usernameRef = useRef(username)
  const supabaseRef = useRef(null)
  const channelRef = useRef(null)
  const stateRef = useRef(null)
  const audioRef = useRef(null)
  const isPlayingRef = useRef(false)
  const loadSeqRef = useRef(0)
  const saveTimerRef = useRef(null)
  const waitTimerRef = useRef(null)
  const lastSavedRef = useRef(0)
  const pendingLoadRef = useRef(null)
  const statusRef = useRef('loading')
  statusRef.current = status
  const prevConnectedRef = useRef(false)

  usernameRef.current = username

  const isHost = Boolean(myId && roomState && roomState.hostId === myId)
  const canControl = isHost || (roomState && roomState.allowEveryoneControl)

  const isHostRef = useRef(isHost)
  const canControlRef = useRef(canControl)
  isHostRef.current = isHost
  canControlRef.current = canControl

  const broadcast = useCallback((event, payload) => {
    const ch = channelRef.current
    if (!ch) return
    ch.send({ type: 'broadcast', event, payload }).catch(() => {})
  }, [])

  // Prefetch the audio URL for a track so that play starts instantly
  // (getAudio caches the URL; loadTrack will hit the cache immediately).
  const prewarmTrack = useCallback((track) => {
    if (!track || !track.videoId) return
    getAudio(track.videoId).catch(() => {})
  }, [])

  // Prefetch the audio URLs of the upcoming tracks in the queue so that when
  // the current track ends, the next one is already buffered and starts
  // immediately without the "Menyiapkan audio..." wait.
  const prewarmQueue = useCallback(
    (queue) => {
      const st = stateRef.current || {}
      const playlist = Array.isArray(queue) ? queue : st.playlist || []
      if (!playlist.length) return
      const curId = st.currentTrack && st.currentTrack.videoId
      let idx = -1
      if (curId) {
        for (let i = 0; i < playlist.length; i++) {
          if (playlist[i].videoId === curId) {
            idx = i
            break
          }
        }
      }
      let warmed = 0
      for (let k = 1; k <= playlist.length && warmed < 2; k++) {
        const t = playlist[(idx + k) % playlist.length]
        if (t && t.videoId !== curId) {
          prewarmTrack(t)
          warmed++
        }
      }
    },
    [prewarmTrack]
  )

  // Preload the actual media into the <audio> element (without playing) as
  // soon as a track becomes current, so buffering already happened by the
  // time the user (or the host) presses play.
  const preloadTrack = useCallback((track) => {
    if (!track || !track.videoId) return
    const audio = audioRef.current
    if (!audio) return
    if (audio.getAttribute('data-video-id') === track.videoId) return
    if (!audio.paused) return
    setAudioPreparing(true)
    getAudio(track.videoId)
      .then((url) => {
        const el = audioRef.current
        if (!el) return
        if (el.getAttribute('data-video-id') === track.videoId) {
          setAudioPreparing(false)
          return
        }
        if (!el.paused) {
          setAudioPreparing(false)
          return
        }
        if (el.getAttribute('data-prewarm') === track.videoId) {
          setAudioPreparing(false)
          return
        }
        el.setAttribute('data-prewarm', track.videoId)
        el.setAttribute('data-video-id', track.videoId)
        el.src = url
        try {
          el.load()
        } catch (e) {
          /* ignore */
        }
        setAudioPreparing(false)
      })
      .catch(() => setAudioPreparing(false))
  }, [])

  const loadTrack = useCallback(async (track, startPos = 0, autoplay = false) => {
    if (!track || !track.videoId) return
    const seq = ++loadSeqRef.current
    setAudioError(false)
    setAudioPreparing(true)
    let url
    try {
      url = await getAudio(track.videoId)
    } catch (e) {
      clearAudioCache(track.videoId)
      try {
        url = await getAudio(track.videoId)
      } catch (e2) {
        if (seq === loadSeqRef.current) {
          setAudioError(true)
          setAudioPreparing(false)
        }
        return
      }
    }
    if (seq !== loadSeqRef.current) {
      setAudioPreparing(false)
      return
    }
    const audio = audioRef.current
    if (!audio) {
      setAudioPreparing(false)
      return
    }
    if (audio.getAttribute('data-video-id') !== track.videoId) {
      // New track: reset the position & time controls back to the start.
      setPosition(0)
      setDuration(0)
    }
    audio.setAttribute('data-video-id', track.videoId)
    audio.src = url
    try {
      audio.load()
    } catch (e) {
      /* ignore */
    }
    setAudioPreparing(false)
    const pos = Math.max(0, Number(startPos) || 0)
    const applyPos = () => {
      if (seq !== loadSeqRef.current) return
      try {
        audio.currentTime = pos
      } catch (e) {
        /* ignore */
      }
    }
    const onMeta = () => {
      if (seq !== loadSeqRef.current) return
      audio.removeEventListener('loadedmetadata', onMeta)
      applyPos()
      if (autoplay) {
        audio
          .play()
          .then(() => {
            isPlayingRef.current = true
            setIsPlaying(true)
            setNeedsUnlock(false)
          })
          .catch(() => setNeedsUnlock(true))
      }
    }
    audio.addEventListener('loadedmetadata', onMeta)
    applyPos()
    if (autoplay) {
      audio
        .play()
        .then(() => {
          isPlayingRef.current = true
          setIsPlaying(true)
          setNeedsUnlock(false)
        })
        .catch(() => setNeedsUnlock(true))
    }
  }, [])

  const updateState = useCallback((patch) => {
    const prev = stateRef.current
    if (!prev) return
    const next = { ...prev, ...patch }
    stateRef.current = next
    setRoomState(next)
    saveCachedRoomState(code, next)
  }, [code])

  const persistRoomState = useCallback(() => {
    const st = stateRef.current
    if (!st || !supabaseRef.current || !isHostRef.current) return
    lastSavedRef.current = Date.now()
    const audio = audioRef.current
    const pos = audio && typeof audio.currentTime === 'number' ? audio.currentTime : st.playback.position
    const payload = {
      ...st,
      playback: { ...st.playback, position: pos, serverTime: getServerTime() },
    }
    saveCachedRoomState(code, payload)
    supabaseRef.current
      .from('rooms')
      .upsert({ code, state: payload, updated_at: new Date().toISOString() })
      .then(() => {})
      .catch(() => {})
  }, [code])

  // Persist state changes (host only), debounced.
  useEffect(() => {
    if (!isHost || !stateRef.current) return
    const now = Date.now()
    if (now - lastSavedRef.current < 600) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => persistRoomState(), 600)
    } else {
      persistRoomState()
    }
  }, [roomState, isHost, persistRoomState])

  // Periodic persist so join-in-progress gets a fresh position.
  useEffect(() => {
    if (!isHost) return
    const iv = setInterval(() => persistRoomState(), PERSIST_INTERVAL)
    return () => clearInterval(iv)
  }, [isHost, persistRoomState])

  // ---------------- handlers ----------------

  const handlePlay = useCallback(
    async ({ trackId, track, position: pos, serverTime }) => {
      setNeedsUnlock(false)
      const st = stateRef.current
      if (!st) return
      let tr = track
      if (!tr) {
        tr =
          (st.playlist || []).find((t) => t.videoId === trackId) || st.currentTrack || null
      }
      if (!tr) return
      const audio = audioRef.current
      if (!audio) return
      if (audio.getAttribute('data-video-id') !== trackId) {
        prewarmTrack(tr)
        await loadTrack(tr, computeTarget(pos, serverTime), true)
        return
      }
      const target = computeTarget(pos, serverTime)
      try {
        audio.currentTime = target
        await audio.play()
        isPlayingRef.current = true
        setIsPlaying(true)
        setNeedsUnlock(false)
      } catch (e) {
        setNeedsUnlock(true)
      }
      updateState({ playback: { playing: true, position: target, serverTime: getServerTime() } })
    },
    [loadTrack, prewarmTrack, updateState]
  )

  const handlePause = useCallback(
    ({ trackId, position: pos }) => {
      const audio = audioRef.current
      const st = stateRef.current
      if (!audio || !st) return
      if (st.currentTrack && st.currentTrack.videoId !== trackId) return
      if (audio.getAttribute('data-video-id') !== trackId) {
        if (!st.currentTrack) return
        loadTrack(st.currentTrack, pos, false)
      }
      audio.pause()
      try {
        audio.currentTime = pos
      } catch (e) {
        /* ignore */
      }
      isPlayingRef.current = false
      setIsPlaying(false)
      updateState({ playback: { playing: false, position: pos, serverTime: getServerTime() } })
    },
    [loadTrack, updateState]
  )

  const handleSeek = useCallback(
    ({ trackId, position: pos }) => {
      const audio = audioRef.current
      const st = stateRef.current
      if (!audio || !st) return
      if (st.currentTrack && st.currentTrack.videoId !== trackId) return
      if (audio.getAttribute('data-video-id') !== trackId) {
        if (!st.currentTrack) return
        loadTrack(st.currentTrack, pos, false)
      }
      try {
        audio.currentTime = pos
      } catch (e) {
        /* ignore */
      }
      updateState({
        playback: { playing: !audio.paused, position: pos, serverTime: getServerTime() },
      })
    },
    [loadTrack, updateState]
  )

  const handleTrackChange = useCallback(
    ({ track, position: pos = 0, playing = false, serverTime }) => {
      if (!track) return
      updateState({ currentTrack: track })
      prewarmTrack(track)
      preloadTrack(track)
      const target = playing ? computeTarget(pos, serverTime) : pos
      loadTrack(track, target, playing)
      prewarmQueue()
    },
    [loadTrack, prewarmTrack, preloadTrack, prewarmQueue, updateState]
  )

  const handleSync = useCallback(
    ({ trackId, track, playing, position: pos, serverTime }) => {
      const audio = audioRef.current
      const st = stateRef.current
      if (!audio || !st) return
      if (!st.currentTrack || st.currentTrack.videoId !== trackId) return
      if (audio.getAttribute('data-video-id') !== trackId) {
        if (!track) return
        prewarmTrack(track)
        const target = computeTarget(pos, serverTime)
        loadTrack(track, target, playing)
        return
      }
      const target = computeTarget(pos, serverTime)
      const cur = audio.currentTime || 0
      if (playing && Math.abs(target - cur) >= TOLERANCE) {
        try {
          audio.currentTime = target
        } catch (e) {
          /* ignore */
        }
      }
      if (playing !== !audio.paused) {
        if (playing) {
          audio
            .play()
            .then(() => {
              isPlayingRef.current = true
              setIsPlaying(true)
            })
            .catch(() => setNeedsUnlock(true))
        } else {
          audio.pause()
          isPlayingRef.current = false
          setIsPlaying(false)
        }
      }
    },
    [loadTrack]
  )

  const handleQueueUpdate = useCallback(
    ({ playlist }) => {
      updateState({ playlist: playlist || [] })
      prewarmQueue(playlist)
    },
    [updateState, prewarmQueue]
  )

  const handleAllowControl = useCallback(
    ({ allow }) => {
      updateState({ allowEveryoneControl: Boolean(allow) })
    },
    [updateState]
  )

  const requestTrackLoad = useCallback(
    (track, position = 0, autoplay = false) => {
      if (!track) return
      prewarmTrack(track)
      const audio = audioRef.current
      if (audio && statusRef.current === 'ready') {
        loadTrack(track, position, autoplay)
      } else {
        pendingLoadRef.current = { track, position, autoplay }
      }
    },
    [loadTrack, prewarmTrack]
  )

  const handleRoomState = useCallback(
    ({ state }) => {
      if (!state) return
      stateRef.current = state
      setRoomState(state)
      saveCachedRoomState(code, state)
      if (waitTimerRef.current) {
        clearTimeout(waitTimerRef.current)
        waitTimerRef.current = null
      }
setStatus('ready')
      if (state.currentTrack) {
        prewarmTrack(state.currentTrack)
        preloadTrack(state.currentTrack)
      }
      prewarmQueue(state.playlist)
      if (state.playback && state.playback.playing && state.currentTrack) {
        const target = computeTarget(state.playback.position, state.playback.serverTime || getServerTime())
        requestTrackLoad(state.currentTrack, target, true)
      }
    },
    [requestTrackLoad, prewarmTrack, preloadTrack, prewarmQueue]
  )

  const handleStateRequest = useCallback(() => {
    if (!isHostRef.current) return
    const st = stateRef.current
    if (!st) return
    const audio = audioRef.current
    const pos = audio && typeof audio.currentTime === 'number' ? audio.currentTime : st.playback.position
    const fresh = {
      ...st,
      playback: { ...st.playback, position: pos, serverTime: getServerTime() },
    }
    broadcast('ROOM_STATE', { state: fresh })
  }, [broadcast])

  // Host broadcasts SYNC periodically.
  useEffect(() => {
    if (!isHost) return
    const iv = setInterval(() => {
      const st = stateRef.current
      const audio = audioRef.current
      if (!st || !st.currentTrack || !audio) return
      broadcast('SYNC', {
        trackId: st.currentTrack.videoId,
        track: st.currentTrack,
        playing: !audio.paused,
        position: audio.currentTime || 0,
        serverTime: getServerTime(),
      })
    }, SYNC_INTERVAL)
    return () => clearInterval(iv)
  }, [isHost, broadcast])

  // ---------------- room init ----------------

  const initRoom = useCallback(
    (uid) => {
      if (!isSupabaseConfigured()) {
        setStatus('error')
        setError('Supabase belum dikonfigurasi. Atur variabel lingkungan di Vercel / .env.local.')
        return
      }
      const supabase = getSupabase()
      supabaseRef.current = supabase
      setStatus('loading')
      estimateServerTimeOffset()

      const presenceId = `${uid}:${getTabToken()}`
      const channel = supabase.channel(`room:${code}`, {
        config: { broadcast: { self: false } },
      })
      channelRef.current = channel

      channel
        .on('presence', { event: 'sync' }, () => {
          const ps = channel.presenceState()
          const list = Object.values(ps)
            .map((v) => (Array.isArray(v) ? v[0] : v))
            .filter(Boolean)
          setMembers(list)
        })
        .on('broadcast', { event: 'PLAY' }, (msg) => handlePlay(msg.payload))
        .on('broadcast', { event: 'PAUSE' }, (msg) => handlePause(msg.payload))
        .on('broadcast', { event: 'SEEK' }, (msg) => handleSeek(msg.payload))
        .on('broadcast', { event: 'TRACK_CHANGE' }, (msg) => handleTrackChange(msg.payload))
        .on('broadcast', { event: 'SYNC' }, (msg) => handleSync(msg.payload))
        .on('broadcast', { event: 'QUEUE_UPDATE' }, (msg) => handleQueueUpdate(msg.payload))
        .on('broadcast', { event: 'ALLOW_CONTROL' }, (msg) => handleAllowControl(msg.payload))
        .on('broadcast', { event: 'ROOM_STATE' }, (msg) => handleRoomState(msg.payload))
        .on('broadcast', { event: 'STATE_REQUEST' }, () => handleStateRequest())

      const fetchInitialState = async () => {
        if (create) {
          const init = emptyRoomState(code, uid)
          stateRef.current = init
          setRoomState(init)
          saveCachedRoomState(code, init)
          await persistRoomState()
          broadcast('ROOM_STATE', { state: { ...init } })
          setStatus('ready')
          return
        }
        const cached = loadCachedRoomState(code)
        let st = null
        try {
          const { data: res, error: err } = await supabase
            .from('rooms')
            .select('state')
            .eq('code', code)
            .maybeSingle()
          if (err) {
            // DB is optional: if the table is missing or a query fails,
            // fall back to the local cache or the host's ROOM_STATE broadcast.
            st = null
          } else {
            st = res && res.state ? res.state : null
          }
        } catch (e) {
          st = null
        }
        if (st) {
          stateRef.current = st
          setRoomState(st)
          saveCachedRoomState(code, st)
          setStatus('ready')
          if (st.currentTrack) {
            prewarmTrack(st.currentTrack)
            preloadTrack(st.currentTrack)
          }
          prewarmQueue(st.playlist)
          if (st.playback && st.playback.playing && st.currentTrack) {
            const target = computeTarget(st.playback.position, st.playback.serverTime || getServerTime())
            requestTrackLoad(st.currentTrack, target, true)
          }
        } else if (cached) {
          // No DB state but we have a local snapshot (e.g. host refreshed while
          // the rooms table is missing/unreachable). Restore it instantly; the
          // host's ROOM_STATE broadcast below will reconcile with the truth.
          stateRef.current = cached
          setRoomState(cached)
          saveCachedRoomState(code, cached)
          setStatus('ready')
          if (cached.currentTrack) {
            prewarmTrack(cached.currentTrack)
            preloadTrack(cached.currentTrack)
          }
          prewarmQueue(cached.playlist)
          if (cached.playback && cached.playback.playing && cached.currentTrack) {
            const target = computeTarget(cached.playback.position, cached.playback.serverTime || getServerTime())
            requestTrackLoad(cached.currentTrack, target, true)
          }
        } else {
          // No persisted state (new room, no DB, or host not online).
          // Wait for the host to answer ROOM_STATE before declaring not-found.
          setStatus('waiting')
          if (waitTimerRef.current) clearTimeout(waitTimerRef.current)
          waitTimerRef.current = setTimeout(() => {
            if (!stateRef.current) {
              setStatus('not-found')
            }
          }, 7000)
        }
        broadcast('STATE_REQUEST', { userId: uid })
      }

      channel.subscribe(async (channelStatus) => {
        const connected = channelStatus === 'SUBSCRIBED'
        setConnectionStatus(connected ? 'connected' : 'reconnecting')
        if (connected) {
          await channel.track({ userId: uid, username: usernameRef.current, isHost: false })
          if (!prevConnectedRef.current) {
            await fetchInitialState()
          } else if (!create) {
            broadcast('STATE_REQUEST', { userId: uid })
          }
          prevConnectedRef.current = true
        } else {
          prevConnectedRef.current = false
        }
      })
    },
    [
      code,
      create,
      broadcast,
      handlePlay,
      handlePause,
      handleSeek,
      handleTrackChange,
      handleSync,
      handleQueueUpdate,
      handleAllowControl,
      handleRoomState,
      handleStateRequest,
      loadTrack,
      requestTrackLoad,
      prewarmTrack,
      prewarmQueue,
      preloadTrack,
      persistRoomState,
    ]
  )

  useEffect(() => {
    const uid = getOrCreateUserId()
    uidRef.current = uid
    setMyId(uid)
    const stored = getStoredUsername()
    if (stored) {
      setUsername(stored)
      usernameRef.current = stored
      initRoom(uid)
    } else {
      setStatus('need-username')
    }

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (waitTimerRef.current) clearTimeout(waitTimerRef.current)
      const ch = channelRef.current
      if (ch) {
        try {
          ch.untrack().then(() => {
            const s = getSupabase()
            if (s) s.removeChannel(ch)
          })
        } catch (e) {
          /* ignore */
        }
      }
      channelRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-track presence when host role changes.
  useEffect(() => {
    const ch = channelRef.current
    if (!ch || !uidRef.current || !usernameRef.current || status !== 'ready') return
    ch.track({
      userId: uidRef.current,
      username: usernameRef.current,
      isHost,
    }).catch(() => {})
  }, [isHost, status])

  // ---------------- controls ----------------

  const submitUsername = useCallback((name) => {
    const clean = sanitizeUsername(name)
    if (!clean) return
    storeUsername(clean)
    setUsername(clean)
    usernameRef.current = clean
    initRoom(uidRef.current || getOrCreateUserId())
  }, [initRoom])

  const togglePlay = useCallback(async () => {
    if (!canControlRef.current) return
    const st = stateRef.current
    const audio = audioRef.current
    if (!st || !audio || !st.currentTrack) return
    const track = st.currentTrack
    if (audio.paused) {
      setNeedsUnlock(false)
      if (audio.getAttribute('data-video-id') !== track.videoId) {
        loadTrack(track, st.playback.position || 0, true)
      } else {
        audio
          .play()
          .then(() => {
            isPlayingRef.current = true
            setIsPlaying(true)
            setNeedsUnlock(false)
          })
          .catch(() => setNeedsUnlock(true))
      }
      broadcast('PLAY', {
        trackId: track.videoId,
        track,
        position: audio.currentTime || st.playback.position || 0,
        serverTime: getServerTime(),
      })
      updateState({
        playback: { playing: true, position: audio.currentTime || 0, serverTime: getServerTime() },
      })
    } else {
      audio.pause()
      isPlayingRef.current = false
      setIsPlaying(false)
      broadcast('PAUSE', {
        trackId: track.videoId,
        track,
        position: audio.currentTime || 0,
        serverTime: getServerTime(),
      })
      updateState({
        playback: { playing: false, position: audio.currentTime || 0, serverTime: getServerTime() },
      })
    }
  }, [broadcast, loadTrack, updateState])

  const seekTo = useCallback(
    (sec) => {
      if (!canControlRef.current) return
      const st = stateRef.current
      const audio = audioRef.current
      if (!st || !audio || !st.currentTrack) return
      audio.currentTime = sec
      updateState({
        playback: { playing: !audio.paused, position: sec, serverTime: getServerTime() },
      })
      broadcast('SEEK', {
        trackId: st.currentTrack.videoId,
        track: st.currentTrack,
        position: sec,
        serverTime: getServerTime(),
      })
    },
    [broadcast, updateState]
  )

  const changeTrack = useCallback(
    (track, playing) => {
      if (!canControlRef.current) return
      const st = stateRef.current
      if (!st) return
      updateState({ currentTrack: track })
      prewarmTrack(track)
      preloadTrack(track)
      loadTrack(track, 0, playing)
      prewarmQueue()
      broadcast('TRACK_CHANGE', {
        track,
        position: 0,
        playing,
        serverTime: getServerTime(),
      })
    },
    [broadcast, loadTrack, prewarmTrack, prewarmQueue, preloadTrack, updateState]
  )

  const next = useCallback(() => {
    const st = stateRef.current
    if (!st) return
    const playlist = st.playlist || []
    if (!playlist.length) return
    const idx = st.currentTrack
      ? playlist.findIndex((t) => t.videoId === st.currentTrack.videoId)
      : -1
    const track = playlist[(idx + 1) % playlist.length]
    changeTrack(track, true)
  }, [changeTrack])

  const prev = useCallback(() => {
    const st = stateRef.current
    if (!st) return
    const playlist = st.playlist || []
    if (!playlist.length) return
    const idx = st.currentTrack
      ? playlist.findIndex((t) => t.videoId === st.currentTrack.videoId)
      : 0
    const track = playlist[(idx - 1 + playlist.length) % playlist.length]
    changeTrack(track, true)
  }, [changeTrack])

  const addToQueue = useCallback(
    (track) => {
      if (!canControlRef.current) return
      const st = stateRef.current
      if (!st) return
      const playlist = [...(st.playlist || [])]
      if (playlist.some((t) => t.videoId === track.videoId)) return
      playlist.push(track)
      const hadCurrent = Boolean(st.currentTrack)
      updateState({ playlist, currentTrack: hadCurrent ? st.currentTrack : track })
      broadcast('QUEUE_UPDATE', { playlist })
      prewarmQueue(playlist)
      if (!hadCurrent) {
        broadcast('TRACK_CHANGE', { track, position: 0, playing: false, serverTime: getServerTime() })
        loadTrack(track, 0, false)
      }
    },
    [broadcast, loadTrack, prewarmQueue, updateState]
  )

  const removeFromQueue = useCallback(
    (index) => {
      if (!canControlRef.current) return
      const st = stateRef.current
      if (!st) return
      const playlist = [...(st.playlist || [])]
      const removed = playlist[index]
      if (!removed) return
      playlist.splice(index, 1)
      const next = { ...st, playlist }
      if (st.currentTrack && st.currentTrack.videoId === removed.videoId) {
        const nextTrack = playlist[index] || playlist[index - 1] || null
        next.currentTrack = nextTrack
        if (nextTrack) {
          loadTrack(nextTrack, 0, false)
          broadcast('TRACK_CHANGE', { track: nextTrack, position: 0, playing: false, serverTime: getServerTime() })
        } else {
          loadTrack(null, 0, false)
        }
      }
      updateState(next)
      prewarmQueue(playlist)
      broadcast('QUEUE_UPDATE', { playlist })
    },
    [broadcast, loadTrack, prewarmQueue, updateState]
  )

  const reorderQueue = useCallback(
    (fromIndex, toIndex) => {
      if (!canControlRef.current) return
      const st = stateRef.current
      if (!st) return
      const playlist = [...(st.playlist || [])]
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= playlist.length || toIndex >= playlist.length) return
      const [item] = playlist.splice(fromIndex, 1)
      playlist.splice(toIndex, 0, item)
      updateState({ playlist })
      broadcast('QUEUE_UPDATE', { playlist })
      prewarmQueue(playlist)
    },
    [broadcast, prewarmQueue, updateState]
  )

  const setAllowEveryoneControl = useCallback(
    (allow) => {
      if (!isHostRef.current) return
      updateState({ allowEveryoneControl: Boolean(allow) })
      broadcast('ALLOW_CONTROL', { allow: Boolean(allow) })
    },
    [broadcast, updateState]
  )

  const setVolume = useCallback((v) => {
    const vol = Math.min(1, Math.max(0, v))
    setVolumeState(vol)
    const audio = audioRef.current
    if (audio) audio.volume = vol
    try {
      localStorage.setItem('syncroom_volume', String(vol))
    } catch (e) {
      /* ignore */
    }
  }, [])

  const retryAudio = useCallback(() => {
    const st = stateRef.current
    if (!st || !st.currentTrack) return
    clearAudioCache(st.currentTrack.videoId)
    loadTrack(st.currentTrack, 0, isPlayingRef.current)
  }, [loadTrack])

  const unlockPlayback = useCallback(async () => {
    setNeedsUnlock(false)
    const st = stateRef.current
    if (!st || !st.currentTrack) return
    const audio = audioRef.current
    if (!audio) return
    if (audio.getAttribute('data-video-id') !== st.currentTrack.videoId) {
      await loadTrack(st.currentTrack, 0, false)
    }
    const target = computeTarget(st.playback.position, st.playback.serverTime || getServerTime())
    try {
      audio.currentTime = target
      await audio.play()
      isPlayingRef.current = true
      setIsPlaying(true)
    } catch (e) {
      setNeedsUnlock(true)
    }
  }, [loadTrack])

  // audio element wiring
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || status !== 'ready') return

    try {
      const saved = Number(localStorage.getItem('syncroom_volume'))
      if (isFinite(saved)) {
        audio.volume = Math.min(1, Math.max(0, saved))
      }
    } catch (e) {
      /* ignore */
    }

    // Flush a track load requested before the <audio> element mounted
    // (e.g. join-in-progress right after state arrived).
    if (pendingLoadRef.current) {
      const p = pendingLoadRef.current
      pendingLoadRef.current = null
      loadTrack(p.track, p.position, p.autoplay)
    }

    const onPlay = () => {
      isPlayingRef.current = true
      setIsPlaying(true)
    }
    const onPause = () => {
      isPlayingRef.current = false
      setIsPlaying(false)
    }
    const onTime = () => {
      setPosition(audio.currentTime || 0)
    }
    const onMeta = () => {
      setDuration(audio.duration || 0)
    }
    const onError = () => {
      setAudioError(true)
    }
    const onEnded = () => {
      if (isHostRef.current) next()
    }
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('error', onError)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('error', onError)
      audio.removeEventListener('ended', onEnded)
    }
  }, [status, next])

  return {
    status,
    error,
    myId,
    username,
    submitUsername,
    code,
    roomState,
    isHost,
    canControl,
    members,
    connectionStatus,
    audioRef,
    isPlaying,
    position,
    duration,
    volume,
    setVolume,
    audioError,
    retryAudio,
    audioPreparing,
    needsUnlock,
    unlockPlayback,
    togglePlay,
    seekTo,
    next,
    prev,
    changeTrack,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    setAllowEveryoneControl,
    resetError: () => setStatus('not-found'),
  }
}