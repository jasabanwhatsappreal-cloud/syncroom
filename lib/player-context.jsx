'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { getAudio, clearAudioCache } from './music'

const PlayerContext = createContext(null)

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function PlayerProvider({ children }) {
  const audioRef = useRef(null)
  const [track, setTrack] = useState(null)
  const [queue, setQueue] = useState([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(1)
  const [preparing, setPreparing] = useState(false)
  const [error, setError] = useState(false)
  const [needsUnlock, setNeedsUnlock] = useState(false)
  const [fullOpen, setFullOpen] = useState(false)
  const [lyricsOpen, setLyricsOpen] = useState(false)

  const queueRef = useRef([])
  const trackRef = useRef(null)
  const indexRef = useRef(0)
  const seqRef = useRef(0)
  const isPlayingRef = useRef(false)
  const fullOpenRef = useRef(false)
  const lyricsOpenRef = useRef(false)
  const volumeRef = useRef(1)

  fullOpenRef.current = fullOpen
  lyricsOpenRef.current = lyricsOpen

  const loadTrack = useCallback((t, startPos = 0, autoplay = false) => {
    if (!t || !t.videoId) return
    const seq = ++seqRef.current
    setError(false)
    setPreparing(true)
    const audio = audioRef.current
    if (!audio) return
    getAudio(t.videoId)
      .then((url) => {
        if (seq !== seqRef.current) return
        const el = audioRef.current
        if (!el) return
        if (el.getAttribute('data-video-id') !== t.videoId) {
          setPosition(0)
          setDuration(0)
        }
        el.setAttribute('data-video-id', t.videoId)
        el.src = url
        try {
          el.load()
        } catch (e) {
          /* ignore */
        }
        setPreparing(false)
        const pos = Math.max(0, Number(startPos) || 0)
        const onMeta = () => {
          if (seq !== seqRef.current) return
          el.removeEventListener('loadedmetadata', onMeta)
          try {
            el.currentTime = pos
          } catch (e) {
            /* ignore */
          }
          if (autoplay) {
            el.play()
              .then(() => {
                isPlayingRef.current = true
                setIsPlaying(true)
                setNeedsUnlock(false)
              })
              .catch(() => setNeedsUnlock(true))
          }
        }
        el.addEventListener('loadedmetadata', onMeta)
        try {
          el.currentTime = pos
        } catch (e) {
          /* ignore */
        }
        if (autoplay) {
          el.play()
            .then(() => {
              isPlayingRef.current = true
              setIsPlaying(true)
              setNeedsUnlock(false)
            })
            .catch(() => setNeedsUnlock(true))
        }
      })
      .catch(() => {
        if (seq !== seqRef.current) return
        setError(true)
        setPreparing(false)
      })
  }, [])

  const playIndex = useCallback(
    (idx) => {
      const q = queueRef.current
      if (!q.length) return
      const i = ((idx % q.length) + q.length) % q.length
      indexRef.current = i
      const t = q[i]
      trackRef.current = t
      setTrack(t)
      loadTrack(t, 0, true)
    },
    [loadTrack]
  )

  const playQueue = useCallback(
    (tracks, startIndex = 0) => {
      const list = (tracks || []).filter((t) => t && t.videoId)
      if (!list.length) return
      queueRef.current = list
      setQueue(list)
      playIndex(startIndex)
    },
    [playIndex]
  )

  const playTrack = useCallback(
    (t, list = null) => {
      if (list && list.length) {
        const idx = Math.max(0, list.findIndex((x) => x.videoId === t.videoId))
        playQueue(list, idx < 0 ? 0 : idx)
      } else {
        queueRef.current = [t]
        setQueue([t])
        indexRef.current = 0
        trackRef.current = t
        setTrack(t)
        loadTrack(t, 0, true)
      }
    },
    [loadTrack, playQueue]
  )

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    const t = trackRef.current
    if (!audio || !t) return
    if (audio.paused) {
      setNeedsUnlock(false)
      audio
        .play()
        .then(() => {
          isPlayingRef.current = true
          setIsPlaying(true)
          setNeedsUnlock(false)
        })
        .catch(() => setNeedsUnlock(true))
    } else {
      audio.pause()
      isPlayingRef.current = false
      setIsPlaying(false)
    }
  }, [])

  const pause = useCallback(() => {
    const audio = audioRef.current
    if (audio && !audio.paused) {
      audio.pause()
      isPlayingRef.current = false
      setIsPlaying(false)
    }
  }, [])

  const next = useCallback(() => {
    playIndex(indexRef.current + 1)
  }, [playIndex])

  const prev = useCallback(() => {
    const audio = audioRef.current
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    playIndex(indexRef.current - 1)
  }, [playIndex])

  const seekTo = useCallback(
    (sec) => {
      const audio = audioRef.current
      if (!audio) return
      try {
        audio.currentTime = Math.max(0, Number(sec) || 0)
      } catch (e) {
        /* ignore */
      }
    },
    []
  )

  const setVolume = useCallback((v) => {
    const vol = Math.min(1, Math.max(0, Number(v) || 0))
    volumeRef.current = vol
    setVolumeState(vol)
    const audio = audioRef.current
    if (audio) audio.volume = vol
    try {
      window.localStorage.setItem('syncroom_volume', String(vol))
    } catch (e) {
      /* ignore */
    }
  }, [])

  const retry = useCallback(() => {
    const t = trackRef.current
    if (!t) return
    clearAudioCache(t.videoId)
    loadTrack(t, 0, isPlayingRef.current)
  }, [loadTrack])

  const unlock = useCallback(() => {
    setNeedsUnlock(false)
    const audio = audioRef.current
    const t = trackRef.current
    if (!audio || !t) return
    audio
      .play()
      .then(() => {
        isPlayingRef.current = true
        setIsPlaying(true)
      })
      .catch(() => setNeedsUnlock(true))
  }, [])

  const openFull = useCallback(() => setFullOpen(true), [])
  const closeFull = useCallback(() => setFullOpen(false), [])
  const toggleLyrics = useCallback(() => setLyricsOpen((v) => !v), [])

  // audio element wiring
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    try {
      const saved = Number(window.localStorage.getItem('syncroom_volume'))
      if (isFinite(saved)) {
        audio.volume = Math.min(1, Math.max(0, saved))
        setVolumeState(audio.volume)
      }
    } catch (e) {
      /* ignore */
    }
    const onPlay = () => {
      isPlayingRef.current = true
      setIsPlaying(true)
    }
    const onPause = () => {
      isPlayingRef.current = false
      setIsPlaying(false)
    }
    const onTime = () => setPosition(audio.currentTime || 0)
    const onMeta = () => setDuration(isFinite(audio.duration) ? audio.duration : 0)
    const onError = () => setError(true)
    const onEnded = () => {
      const q = queueRef.current
      if (q.length > 1) playIndex(indexRef.current + 1)
      else {
        isPlayingRef.current = false
        setIsPlaying(false)
      }
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
  }, [playIndex])

  const value = {
    audioRef,
    track,
    queue,
    isPlaying,
    position,
    duration,
    volume,
    preparing,
    error,
    needsUnlock,
    fullOpen,
    lyricsOpen,
    playTrack,
    playQueue,
    togglePlay,
    pause,
    next,
    prev,
    seekTo,
    setVolume,
    retry,
    unlock,
    openFull,
    closeFull,
    toggleLyrics,
    formatTime,
  }

  return (
    <PlayerContext.Provider value={value}>
      <audio ref={audioRef} preload="auto" />
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider')
  return ctx
}
