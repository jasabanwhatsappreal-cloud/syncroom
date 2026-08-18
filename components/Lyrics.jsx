'use client'

import { useEffect, useRef, useState } from 'react'
import { getLyrics } from '@/lib/music'

export default function Lyrics({ track, audioRef, isPlaying }) {
  const [result, setResult] = useState(null)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const containerRef = useRef(null)
  const activeRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!track || !track.videoId) {
      setResult(null)
      setFailed(false)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setFailed(false)
    getLyrics(track.videoId, track.title, track.artist)
      .then((data) => {
        if (cancelled) return
        const lyrics = data && (data.plainLyrics || (data.syncedLyrics && data.syncedLyrics.length))
        if (lyrics) {
          setResult(data)
          setActiveIdx(-1)
        } else {
          setResult(null)
          setFailed(true)
        }
      })
      .catch(() => {
        if (cancelled) return
        setResult(null)
        setFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [track])

  // Highlight active synced line based on audio.currentTime.
  useEffect(() => {
    if (!result || !result.syncedLyrics || !audioRef || !audioRef.current || !isPlaying) return
    const lines = result.syncedLyrics
    const tick = () => {
      const audio = audioRef.current
      if (!audio) return
      const t = audio.currentTime || 0
      let idx = -1
      for (let i = 0; i < lines.length; i++) {
        if (t >= lines[i].time) idx = i
        else break
      }
      setActiveIdx(idx)
    }
    const loop = () => {
      tick()
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [result, audioRef, isPlaying])

  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      const c = containerRef.current
      const el = activeRef.current
      const top = el.offsetTop - c.clientHeight / 2 + el.clientHeight / 2
      c.scrollTo({ top, behavior: 'smooth' })
    }
  }, [activeIdx])

  if (loading) return <p className="loading-text">Memuat lirik...</p>
  if (failed) return <p className="empty-text">Lirik tidak tersedia untuk lagu ini.</p>
  if (!result) return null

  const synced = result.syncedLyrics || []

  if (synced.length) {
    return (
      <div className="lyrics" ref={containerRef}>
        {synced.map((l, i) => (
          <div
            key={i}
            ref={i === activeIdx ? activeRef : null}
            className={`lyric-line ${i === activeIdx ? 'active' : ''}`}
          >
            {l.text}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="lyrics plain">
      {result.plainLyrics.split('\n').map((line, i) => (
        <div key={i} className="lyric-line">
          {line || '\u00A0'}
        </div>
      ))}
    </div>
  )
}