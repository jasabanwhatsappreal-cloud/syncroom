'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { searchMusic } from '@/lib/music'
import { useNav } from '@/lib/nav-context'
import { usePlayer } from '@/lib/player-context'
import { toggleLiked } from '@/lib/liked'
import { TrackRow, AlbumCard, PlaylistCard, ArtistCard } from './Cards'
import Icon from './Icons'

const FILTERS = [
  { key: 'songs', label: 'Musik' },
  { key: 'playlists', label: 'Playlist' },
  { key: 'artists', label: 'Artis' },
]

export default function SearchView() {
  const nav = useNav()
  const player = usePlayer()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('songs')
  const [data, setData] = useState({ songs: [], playlists: [], albums: [], artists: [] })
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const inputRef = useRef(null)
  const initialRef = useRef(false)

  useEffect(() => {
    const pending = sessionStorage.getItem('syncroom_pending_q')
    if (pending) {
      sessionStorage.removeItem('syncroom_pending_q')
      setQ(pending)
    } else {
      setTimeout(() => inputRef.current && inputRef.current.focus(), 350)
    }
    initialRef.current = true
  }, [])

  useEffect(() => {
    if (!initialRef.current) return
    const term = q.trim()
    if (!term) {
      setData({ songs: [], playlists: [], albums: [], artists: [] })
      setHasSearched(false)
      return
    }
    setLoading(true)
    const id = setTimeout(() => {
      searchMusic(term)
        .then((res) => {
          setData({
            songs: (res && res.songs) || [],
            playlists: (res && res.playlists) || [],
            albums: (res && res.albums) || [],
            artists: (res && res.artists) || [],
          })
          setHasSearched(true)
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(id)
  }, [q])

  const like = useCallback((t) => {
    toggleLiked(t)
  }, [])

  const showTrack = useCallback((songs, i) => player.playQueue(songs, i), [player])

  const playlistItems = data.playlists.concat(data.albums)
  const activeTrackId = player.track && player.track.videoId

  return (
    <div className="search-view">
      <div className="search-top">
        <h1>Cari</h1>
        <div className="hero-search">
          <span className="search-icon">
            <Icon name="search" size={18} />
          </span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari lagu, artis, atau album..."
          />
        </div>
      </div>

      {q.trim() ? (
        <>
          <div className="filter-tabs">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={`filter-tab ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="loading-block">
              <Icon name="spinner" size={28} spin />
            </div>
          ) : filter === 'songs' ? (
            <div className="song-list">
              {data.songs.length ? (
                data.songs.map((t, i) => (
                  <TrackRow
                    key={t.videoId}
                    track={t}
                    index={i}
                    active={activeTrackId === t.videoId}
                    playing={player.isPlaying}
                    onClick={() => showTrack(data.songs, i)}
                    onLike={like}
                  />
                ))
              ) : (
                <EmptyState msg="Tidak ada lagu ditemukan" />
              )}
            </div>
          ) : filter === 'playlists' ? (
            <div className="card-grid">
              {playlistItems.length ? (
                playlistItems.map((p) =>
                  p.id && p.id.startsWith('MPREb_') ? (
                    <AlbumCard
                      key={p.id}
                      album={p}
                      onClick={() => nav.openAlbum(p.id, p.title, p.cover)}
                      playOnClick={() => {
                        nav.openAlbum(p.id, p.title, p.cover)
                      }}
                    />
                  ) : (
                    <PlaylistCard
                      key={p.id}
                      playlist={p}
                      onClick={() => nav.openPlaylist(p.id, p.title, p.cover)}
                      playOnClick={() => {
                        nav.openPlaylist(p.id, p.title, p.cover)
                      }}
                    />
                  )
                )
              ) : (
                <EmptyState msg="Tidak ada playlist ditemukan" />
              )}
            </div>
          ) : (
            <div className="card-grid">
              {data.artists.length ? (
                data.artists.map((a) => (
                  <ArtistCard
                    key={a.id}
                    artist={a}
                    onClick={() => nav.openArtist(a.id, a.title, a.cover)}
                  />
                ))
              ) : (
                <EmptyState msg="Tidak ada artis ditemukan" />
              )}
            </div>
          )}
        </>
      ) : hasSearched ? null : (
        <div className="search-empty">
          <Icon name="search" size={40} />
          <p>Temukan lagu favoritmu</p>
          <span>Cari judul lagu, artis, atau album</span>
        </div>
      )}
    </div>
  )
}

function EmptyState({ msg }) {
  return (
    <div className="empty-state">
      <p>{msg}</p>
    </div>
  )
}
