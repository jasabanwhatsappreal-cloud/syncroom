'use client'

import { useRef, useState } from 'react'
import Icon from './Icons'

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function Player({
  track,
  isPlaying,
  position,
  duration,
  volume,
  setVolume,
  togglePlay,
  seekTo,
  next,
  prev,
  canControl,
  audioError,
  retryAudio,
  audioPreparing,
  needsUnlock,
  unlockPlayback,
}) {
  const [dragging, setDragging] = useState(false)
  const [dragPos, setDragPos] = useState(0)
  const sliderRef = useRef(null)
  const showVolume = canControl || true

  const progress = duration > 0 ? Math.min(1, (dragging ? dragPos : position) / duration) : 0
  const current = dragging ? dragPos : position

  const onSeekChange = (e) => {
    const sec = Number(e.target.value)
    setDragPos(sec)
    setDragging(true)
  }

  const onSeekEnd = () => {
    setDragging(false)
    if (seekTo && duration > 0) {
      seekTo(dragPos)
    }
  }

  const art = track && track.thumbnail ? track.thumbnail : ''
  const title = track ? track.title : 'Belum ada lagu'
  const artist = track ? track.artist : 'Tambahkan lagu dari pencarian'

  return (
    <div className="player">
      <div className="player-track">
        <div className={`player-art ${art ? '' : 'player-art-empty'}`}>
          {art ? <img src={art} alt="" /> : <Icon name="headphones" size={44} />}
        </div>
        <div className="player-meta">
          <div className="player-title">{title}</div>
          <div className="player-artist">{artist}</div>
        </div>
      </div>

      <div className="player-seek">
        <div className="player-timebar">
          <span className="wave-preview">
            <span className="wave-preview-fill" style={{ width: `${progress * 100}%` }} />
          </span>
        </div>
      </div>

      <input
        className="seek-input"
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(current, duration || 100000)}
        disabled={!canControl || !duration}
        onChange={onSeekChange}
        onPointerUp={onSeekEnd}
        onKeyUp={onSeekEnd}
      />

      <div className="player-times">
        <span>{formatTime(current)}</span>
        <span>{duration ? `-${formatTime(Math.max(0, duration - current))}` : ''}</span>
      </div>

      <div className="player-controls">
        <button
          className="ctrl-btn"
          onClick={prev}
          disabled={!canControl || !track}
          title="Previous"
          aria-label="Previous"
        >
          <Icon name="prev" size={22} />
        </button>
        <button
          className="ctrl-btn ctrl-play"
          onClick={togglePlay}
          disabled={!canControl || !track || audioPreparing}
          title={audioPreparing ? 'Menyiapkan audio...' : isPlaying ? 'Pause' : 'Play'}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {audioPreparing ? <Icon name="spinner" spin size={24} /> : <Icon name={isPlaying ? 'pause' : 'play'} size={24} />}
        </button>
        <button
          className="ctrl-btn"
          onClick={next}
          disabled={!canControl || !track}
          title="Next"
          aria-label="Next"
        >
          <Icon name="next" size={22} />
        </button>
      </div>

      {audioPreparing && !isPlaying ? (
        <div className="audio-preparing">Menyiapkan audio...</div>
      ) : null}

      {needsUnlock ? (
        <button className="btn btn-unlock" onClick={unlockPlayback}>
          {canControl ? 'Sinkronkan & Play' : 'Tap untuk mulai sinkronisasi'}
        </button>
      ) : null}

      {audioError ? (
        <div className="audio-error">
          <span>Audio gagal dimuat.</span>
          <button className="btn btn-small" onClick={retryAudio}>
            Coba Lagi
          </button>
        </div>
      ) : null}

      {showVolume ? (
        <div className="player-volume">
          <Icon name={volume > 0 ? 'volume' : 'volumeOff'} size={16} />
          <input
            className="volume-input"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </div>
      ) : null}
    </div>
  )
}