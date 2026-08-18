'use client'

import { useEffect, useState } from 'react'
import { searchMusic } from '@/lib/music'
import { useNav } from '@/lib/nav-context'
import { usePlayer } from '@/lib/player-context'
import { MediaCard, pickCover } from './Cards'
import Icon from './Icons'

const ROWS = [
  { key: 'dangdut', q: 'dangdut terbaru', label: 'Dangdut Hits' },
  { key: 'pop', q: 'pop indonesia terbaru', label: 'Pop Indonesia' },
  { key: 'rock', q: 'rock terbaik', label: 'Rock Favorit' },
  { key: 'jazz', q: 'jazz santai', label: 'Jazz & Chill' },
  { key: 'hiphop', q: 'hip hop terbaru', label: 'Hip Hop' },
]

function Row({ row }) {
  const player = usePlayer()
  const nav = useNav()
  const [songs, setSongs] = useState([])

  useEffect(() => {
    let cancelled = false
    searchMusic(row.q, 'songs')
      .then((data) => {
        if (cancelled) return
        setSongs((data && data.songs) || [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [row.q])

  if (!songs.length) return null

  return (
    <section>
      <h2 className="section-heading">{row.label}</h2>
      <div className="h-scroll hide-scrollbar">
        {songs.slice(0, 10).map((t, i) => {
          const active = player.track && player.track.videoId === t.videoId
          return (
            <MediaCard
              key={`${row.key}-${t.videoId}`}
              cover={pickCover(t.thumbnail, t.videoId)}
              title={t.title}
              sub={t.artist}
              playing={active && player.isPlaying}
              onClick={() => player.playQueue(songs, i)}
              playOnClick={() => player.playQueue(songs, i)}
            />
          )
        })}
      </div>
    </section>
  )
}

export default function HomeView() {
  const nav = useNav()
  const [q, setQ] = useState('')

  return (
    <div className="home-view">
      <div className="hero">
        <h1>Beranda</h1>
        <p>Dengarkan musik bersama teman, kapan saja.</p>
        <form
          className="hero-search"
          onSubmit={(e) => {
            e.preventDefault()
            nav.go('search')
            sessionStorage.setItem('syncroom_pending_q', q)
          }}
        >
          <span className="search-icon">
            <Icon name="search" size={18} />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari lagu, artis, atau album..."
          />
        </form>
      </div>

      {ROWS.map((r) => (
        <Row key={r.key} row={r} />
      ))}
    </div>
  )
}
