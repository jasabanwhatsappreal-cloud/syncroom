'use client'

import { useEffect, useState } from 'react'
import { getAlbum, getArtist } from '@/lib/music'
import { useNav } from '@/lib/nav-context'
import { usePlayer } from '@/lib/player-context'
import { toggleLiked, importToPlaylist, getLikedSongs, getPlaylist } from '@/lib/liked'
import { TrackRow } from './Cards'
import Icon from './Icons'

function bigThumb(thumbnails) {
  if (!Array.isArray(thumbnails) || !thumbnails.length) return ''
  const last = thumbnails[thumbnails.length - 1]
  if (typeof last === 'string') return last
  if (last && last.url) return last.url
  return ''
}

function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function DetailOverlay() {
  const nav = useNav()
  const player = usePlayer()
  const detail = nav.detail

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!detail) {
      setData(null)
      setSaved(false)
      return
    }
    setLoading(true)
    setError(false)
    setSaved(false)
    setData(null)

    if (detail.type === 'liked') {
      setData({ title: 'Lagu Disukai', songs: getLikedSongs() })
      setLoading(false)
      return
    }
    if (detail.type === 'localPlaylist') {
      const p = getPlaylist(detail.id)
      setData(p ? { title: p.title, songs: p.tracks, thumbnails: p.cover ? [{ url: p.cover }] : [] } : null)
      setLoading(false)
      return
    }

    const promise =
      detail.type === 'artist' ? getArtist(detail.id) : getAlbum(detail.id)
    promise
      .then((res) => {
        setData(res)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [detail])

  if (!detail) return null

  const close = () => {
    nav.closeDetail()
  }

  const isArtist = detail.type === 'artist'
  const cover = isArtist
    ? bigThumb(data && data.thumbnails) || detail.cover || ''
    : bigThumb(data && data.thumbnails) || detail.cover || ''
  const title = isArtist ? (data && data.name) || detail.name : (data && data.title) || detail.title
  const artist = isArtist ? '' : (data && data.songs && data.songs[0] && data.songs[0].artist) || ''
  const songs = isArtist ? (data && data.topSongs) || [] : (data && data.songs) || []

  const playAll = () => {
    if (songs.length) player.playQueue(songs, 0)
  }

  const shufflePlay = () => {
    if (songs.length) player.playQueue(shuffle(songs), 0)
  }

  const toggleLike = (t) => {
    toggleLiked(t)
  }

  const saveAsPlaylist = () => {
    const p = importToPlaylist('__new__', songs, cover)
    setSaved(true)
    setTimeout(() => setSaved(false), 1600)
  }

  const activeTrackId = player.track && player.track.videoId
  let label = 'Album'
  if (isArtist) label = 'Artis'
  else if (detail.type === 'liked') label = 'Lagu Disukai'
  else if (detail.type === 'localPlaylist') label = 'Playlist'
  else if (detail.id && detail.id.startsWith('VL')) label = 'Playlist'

  return (
    <div className="detail-backdrop" onClick={close}>
      <div className="detail" onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div className="loading-block">
            <Icon name="spinner" size={30} spin />
          </div>
        ) : (
          <>
            {cover ? (
              <div className="detail-hero">
                <img className="detail-hero-bg" src={cover} alt="" />
                <div className="detail-hero-veil" />
                <button className="detail-close" onClick={close} aria-label="Tutup">
                  <Icon name="close" size={20} />
                </button>
                <div className="detail-info">
                  <div className="detail-label">{label || (isArtist ? 'Artis' : 'Playlist')}</div>
                  <h2 className="detail-title">{title}</h2>
                  {artist ? <p className="detail-artist">{artist}</p> : null}
                </div>
              </div>
            ) : (
              <div className="detail-info" style={{ position: 'static', padding: '20px 16px 0' }}>
                <div className="detail-label">{label || (isArtist ? 'Artis' : 'Playlist')}</div>
                <h2 className="detail-title">{title}</h2>
                {artist ? <p className="detail-artist">{artist}</p> : null}
              </div>
            )}

            <div className="detail-actions">
              <button className="play-all-btn" onClick={playAll} aria-label="Putar semua">
                <Icon name="play" size={26} />
              </button>
              <button className="detail-tool" onClick={shufflePlay} aria-label="Acak">
                <Icon name="shuffle" size={18} />
              </button>
              {detail.type === 'album' || detail.type === 'playlist' ? (
                <button className="detail-tool" onClick={saveAsPlaylist} aria-label="Simpan ke playlist">
                  <Icon name={saved ? 'heart' : 'plus'} size={18} />
                </button>
              ) : null}
              <span className="song-dur" style={{ marginLeft: 'auto', fontSize: 13 }}>
                {songs.length} lagu
              </span>
            </div>

            <div className="detail-list">
              {error ? (
                <p className="detail-empty">Gagal memuat data. Coba lagi.</p>
              ) : songs.length ? (
                songs.map((t, i) => (
                  <TrackRow
                    key={t.videoId}
                    track={t}
                    index={i}
                    active={activeTrackId === t.videoId}
                    playing={player.isPlaying}
                    onClick={() => player.playQueue(songs, i)}
                    onLike={toggleLike}
                  />
                ))
              ) : (
                <p className="detail-empty">Tidak ada lagu.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
