'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { getLyrics } from '@/lib/music'
import { normalizeLyrics } from '@/lib/music-parser'
import { usePlayer } from '@/lib/player-context'
import { pickCover } from './Cards'
import Icon from './Icons'

export default function LyricsOverlay() {
  const player = usePlayer()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const activeRef = useRef(null)

  const track = player.track

  useEffect(() => {
    if (!track) return
    setData(null)
    setLoading(true)
    setError(false)
    let cancelled = false
    getLyrics(track.videoId, track.title, track.artist)
      .then((res) => {
        if (cancelled) return
        setData(normalizeLyrics(res && res.result ? res.result : res))
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError(true)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [track && track.videoId])

  const synced = data && data.syncedLyrics
  const plain = (data && data.plainLyrics) || ''

  const activeIdx = useMemo(() => {
    if (!synced || !synced.length) return -1
    const t = player.position
    let idx = -1
    for (let i = 0; i < synced.length; i++) {
      if (t >= synced[i].time) idx = i
      else break
    }
    return idx
  }, [synced, player.position])

  useEffect(() => {
    const el = activeRef.current
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [activeIdx])

  const cover = pickCover(track && track.thumbnail, track && track.videoId)
  if (!track) return null

  return (
    <div className="lyrics-overlay">
      <div className="fp-bg">
        {cover ? <img src={cover} alt="" /> : null}
        <div className="fp-bg-vignette" />
      </div>

      <div className="lyrics-head">
        {cover ? <img src={cover} alt="" /> : null}
        <div className="lyrics-head-meta">
          <div className="lyrics-head-title">{track.title}</div>
          <div className="lyrics-head-sub">{track.artist}</div>
        </div>
        <button className="detail-close" onClick={player.toggleLyrics} aria-label="Tutup">
          <Icon name="close" size={20} />
        </button>
      </div>

      <div className={`lyrics-scroll ${synced ? '' : 'lyrics-plain'}`}>
        {loading ? (
          <div className="loading-block">
            <Icon name="spinner" size={26} spin />
          </div>
        ) : error ? (
          <div className="empty-state">
            <p>Lirik tidak ditemukan.</p>
          </div>
        ) : synced && synced.length ? (
          synced.map((l, i) => (
            <div
              key={i}
              ref={i === activeIdx ? activeRef : null}
              className={`lyric-line ${i === activeIdx ? 'active' : ''} ${i < activeIdx ? 'past' : ''}`}
              onClick={() => player.seekTo(l.time)}
            >
              {l.text || '\u00a0'}
            </div>
          ))
        ) : plain ? (
          plain.split('\n').map((line, i) => (
            <div key={i} className="lyric-line">
              {line || '\u00a0'}
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>Lirik tidak tersedia untuk lagu ini.</p>
          </div>
        )}
      </div>
    </div>
  )
}
