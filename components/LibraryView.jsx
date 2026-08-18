'use client'

import { useEffect, useState } from 'react'
import { useNav } from '@/lib/nav-context'
import { getLikedSongs, getPlaylists, createPlaylist, deletePlaylist, subscribe } from '@/lib/liked'
import { pickCover } from './Cards'
import Icon from './Icons'

export default function LibraryView() {
  const nav = useNav()
  const [, force] = useState(0)

  useEffect(() => subscribe(() => force((v) => v + 1)), [])

  const liked = getLikedSongs()
  const playlists = getPlaylists()

  const makePlaylist = () => {
    const p = createPlaylist({ title: 'Playlist Baru' })
    nav.openLocalPlaylist(p.id)
  }

  return (
    <div className="library-view">
      <div className="library-head">
        <h1>Library</h1>
      </div>

      <div className="library-sections">
        <div className="lib-row" onClick={nav.openLiked} role="button" tabIndex={0}>
          <div className="lib-row-icon">
            <Icon name="heart" size={22} />
          </div>
          <div className="lib-row-main">
            <div className="lib-row-title">Lagu Disukai</div>
            <div className="lib-row-sub">{liked.length} lagu</div>
          </div>
          <span className="lib-row-arrow">
            <Icon name="next" size={18} />
          </span>
        </div>

        <button className="lib-row" onClick={makePlaylist}>
          <div className="lib-row-icon">
            <Icon name="plus" size={22} />
          </div>
          <div className="lib-row-main">
            <div className="lib-row-title">Buat Playlist Baru</div>
            <div className="lib-row-sub">Simpan lagu favoritmu</div>
          </div>
        </button>

        {playlists.map((p) => (
          <div
            key={p.id}
            className="lib-row"
            onClick={() => nav.openLocalPlaylist(p.id)}
            role="button"
            tabIndex={0}
          >
            <div className="lib-row-icon" style={{ overflow: 'hidden', padding: 0 }}>
              {p.cover ? (
                <img
                  src={p.cover}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Icon name="list" size={22} />
              )}
            </div>
            <div className="lib-row-main">
              <div className="lib-row-title">{p.title}</div>
              <div className="lib-row-sub">{p.tracks.length} lagu</div>
            </div>
            <button
              className="icon-btn"
              aria-label="Hapus playlist"
              onClick={(e) => {
                e.stopPropagation()
                deletePlaylist(p.id)
              }}
            >
              <Icon name="trash" size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
