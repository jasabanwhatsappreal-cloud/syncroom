'use client'

import { useState } from 'react'
import { usePlayer } from '@/lib/player-context'
import { isLiked, toggleLiked } from '@/lib/liked'
import { pickCover, useLikedStore } from './Cards'
import Icon from './Icons'

export default function FullPlayer() {
  const player = usePlayer()
  const [dragPos, setDragPos] = useState(null)
  const [wasPlaying, setWasPlaying] = useState(false)
  useLikedStore()

  if (!player.track) return null
  const cover = pickCover(player.track.thumbnail, player.track.videoId)
  const liked = isLiked(player.track.videoId)
  const shown = dragPos != null ? dragPos : player.position
  const progress = player.duration ? (shown / player.duration) * 100 : 0

  const onSeekDown = (e) => {
    const audio = player.audioRef && player.audioRef.current
    setWasPlaying(audio && !audio.paused)
    player.pause()
    setDragPos(player.position)
  }
  const onSeekMove = (e) => {
    if (dragPos == null) return
    const input = e.currentTarget
    const max = input.max ? Number(input.max) : player.duration || 0
    setDragPos(Number(e.currentTarget.value))
  }
  const onSeekUp = (e) => {
    const input = e.currentTarget
    const max = input.max ? Number(input.max) : player.duration || 0
    const val = Math.max(0, Math.min(Number(input.value), max || 0))
    player.seekTo(val)
    setDragPos(null)
    if (wasPlaying) player.togglePlay()
    setWasPlaying(false)
  }

  return (
    <div className="full-player">
      <div className="fp-bg">
        {cover ? <img src={cover} alt="" /> : null}
        <div className="fp-bg-vignette" />
      </div>

      <div className="fp-content">
        <div className="fp-top">
          <h2>Sedang Diputar</h2>
          <button className="fp-close" onClick={player.closeFull} aria-label="Tutup">
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="fp-disc-wrap">
          <button
            className={`fp-disc ${player.isPlaying ? 'playing' : ''}`}
            onClick={player.togglePlay}
            aria-label={player.isPlaying ? 'Jeda' : 'Putar'}
          >
            {cover ? <img src={cover} alt="" /> : <Icon name="music" size={90} />}
          </button>
        </div>

        <div className="fp-meta">
          <h2 className="fp-title">{player.track.title}</h2>
          <div className="fp-artist">{player.track.artist}</div>
        </div>

        {player.preparing ? (
          <div className="audio-preparing">
            <Icon name="spinner" size={18} spin />
            <span>Menyiapkan audio...</span>
          </div>
        ) : player.error ? (
          <div className="audio-error">
            <span>Gagal memuat audio.</span>
            <button className="btn btn-secondary btn-small" onClick={player.retry}>
              Coba lagi
            </button>
          </div>
        ) : player.needsUnlock ? (
          <div className="audio-error">
            <span>Ketuk untuk memutar.</span>
            <button className="btn btn-secondary btn-small" onClick={player.unlock}>
              Putar
            </button>
          </div>
        ) : null}

        <div className="fp-progress">
          <input
            type="range"
            min={0}
            max={player.duration || 0}
            step={0.1}
            value={shown || 0}
            onChange={(e) => setDragPos(Number(e.currentTarget.value))}
            onPointerDown={onSeekDown}
            onPointerMove={onSeekMove}
            onPointerUp={onSeekUp}
            onPointerCancel={onSeekUp}
            disabled={!player.duration}
            style={{
              background: `linear-gradient(90deg, var(--text) ${progress}%, rgba(255,255,255,0.15) ${progress}%)`,
            }}
          />
          <div className="fp-times">
            <span>{player.formatTime(shown)}</span>
            <span>{player.formatTime(player.duration)}</span>
          </div>
        </div>

        <div className="fp-controls">
          <button className="fp-ctrl" onClick={player.prev} aria-label="Sebelumnya">
            <Icon name="prev" size={24} />
          </button>
          <button
            className="fp-play"
            onClick={player.togglePlay}
            disabled={player.preparing}
            aria-label={player.isPlaying ? 'Jeda' : 'Putar'}
          >
            {player.preparing ? (
              <Icon name="spinner" size={26} spin />
            ) : (
              <Icon name={player.isPlaying ? 'pause' : 'play'} size={30} />
            )}
          </button>
          <button className="fp-ctrl" onClick={player.next} aria-label="Berikutnya">
            <Icon name="next" size={24} />
          </button>
        </div>

        <div className="fp-bottom-row">
          <button
            className="fp-lyrics-btn"
            onClick={() => {
              player.toggleLyrics()
            }}
          >
            <Icon name="lyrics" size={16} />
            Lirik
          </button>
          <div className="fp-volume">
            <Icon name={player.volume > 0 ? 'volume' : 'volumeOff'} size={16} />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={player.volume}
              onChange={(e) => player.setVolume(Number(e.currentTarget.value))}
              className="volume-input"
              aria-label="Volume"
            />
          </div>
          <button
            className={`detail-tool ${liked ? 'liked' : ''}`}
            style={{ width: 38, height: 38 }}
            onClick={() => toggleLiked(player.track)}
            aria-label={liked ? 'Batal suka' : 'Suka'}
          >
            <Icon name={liked ? 'heart' : 'heartOutline'} size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
