'use client'

import { useEffect, useState } from 'react'
import { subscribe, isLiked } from '@/lib/liked'
import Icon from './Icons'

export function useLikedStore() {
  const [, force] = useState(0)
  useEffect(() => subscribe(() => force((v) => v + 1)), [])
}

export function formatDuration(value) {
  if (!value) return ''
  const s = String(value)
  if (s.includes(':')) return s
  const m = s.match(/^(\d+)(?:\.(\d+))?$/)
  if (!m) return ''
  const min = Number(m[1])
  const sec = m[2] ? Number(m[2]) : 0
  if (!isFinite(min)) return ''
  const safe = sec >= 60 ? 0 : sec
  return `${min}:${String(safe).padStart(2, '0')}`
}

export function fallbackCover(videoId) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

export function pickCover(thumbnail, videoId) {
  if (thumbnail && thumbnail !== 'undefined') return thumbnail
  if (videoId) return fallbackCover(videoId)
  return ''
}

export function Equalizer({ playing = true }) {
  return (
    <span className={`eq ${playing ? '' : 'paused'}`}>
      <span className="eq-bar" />
      <span className="eq-bar" />
      <span className="eq-bar" />
      <span className="eq-bar" />
    </span>
  )
}

export function TrackRow({ track, index, active = false, playing = false, onClick, onLike }) {
  useLikedStore()
  const liked = track ? isLiked(track.videoId) : false
  const cover = pickCover(track && track.thumbnail, track && track.videoId)
  return (
    <div
      className={`song-row ${active ? 'active' : ''}`}
      style={{ animationDelay: `${Math.min((index || 0) * 35, 450)}ms` }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick && onClick()
        }
      }}
    >
      <img
        className="song-cover"
        src={cover}
        alt=""
        loading="lazy"
        onError={(e) => {
          if (e.currentTarget.src !== fallbackCover(track && track.videoId)) {
            e.currentTarget.src = fallbackCover(track && track.videoId)
          }
        }}
      />
      <div className="song-main">
        <div className="song-title">{track.title}</div>
        <div className="song-sub">{track.artist || ''}</div>
      </div>
      <div className="song-side">
        {active ? <Equalizer playing={playing} /> : <span className="song-dur">{formatDuration(track.duration)}</span>}
        {onLike ? (
          <button
            className={`icon-btn ${liked ? 'liked' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              onLike(track)
            }}
            aria-label={liked ? 'Batal suka' : 'Suka'}
          >
            <Icon name={liked ? 'heart' : 'heartOutline'} size={16} />
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function MediaCard({ cover, title, sub, onClick, playOnClick, playing = false }) {
  return (
    <div className="media-card animate-card-up" onClick={onClick} role="button" tabIndex={0}>
      <div className="media-cover">
        <img src={cover || ''} alt="" loading="lazy" />
        {playing ? (
          <div className="cover-play" style={{ opacity: 1, background: 'transparent' }}>
            <Equalizer playing />
          </div>
        ) : (
          <div className="cover-play">
            <span className="play-chip" onClick={(e) => {
              e.stopPropagation()
              playOnClick && playOnClick()
            }}>
              <Icon name="play" size={22} />
            </span>
          </div>
        )}
      </div>
      <div className="media-body">
        <div className="media-title">{title}</div>
        {sub ? <div className="media-sub">{sub}</div> : null}
      </div>
    </div>
  )
}

export function AlbumCard({ album, onClick, playOnClick }) {
  return (
    <MediaCard
      cover={album.cover}
      title={album.title}
      sub={album.artist}
      onClick={onClick}
      playOnClick={playOnClick}
    />
  )
}

export function PlaylistCard({ playlist, onClick, playOnClick }) {
  return (
    <MediaCard
      cover={playlist.cover}
      title={playlist.title}
      sub={playlist.artist}
      onClick={onClick}
      playOnClick={playOnClick}
    />
  )
}

export function ArtistCard({ artist, onClick }) {
  return (
    <div className="media-card artist-card animate-card-up" onClick={onClick} role="button" tabIndex={0}>
      <img className="artist-photo" src={artist.cover || ''} alt="" loading="lazy" />
      <div className="media-title">{artist.title}</div>
      <div className="media-sub" style={{ marginTop: 4, textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.08em' }}>
        {artist.artist || 'Artis'}
      </div>
    </div>
  )
}
