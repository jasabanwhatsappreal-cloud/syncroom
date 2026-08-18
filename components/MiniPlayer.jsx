'use client'

import { usePlayer } from '@/lib/player-context'
import { pickCover } from './Cards'
import Icon from './Icons'

export default function MiniPlayer() {
  const player = usePlayer()
  if (!player.track) return null
  const cover = pickCover(player.track.thumbnail, player.track.videoId)

  return (
    <div className="mini-container">
      <div className="mini" onClick={() => player.openFull()}>
        <div className={`mini-art ${player.isPlaying ? 'playing' : ''}`}>
          {cover ? <img src={cover} alt="" /> : <Icon name="music" size={20} />}
        </div>
        <div className="mini-info">
          <div className="mini-title">{player.track.title}</div>
          <div className="mini-sub">{player.track.artist}</div>
        </div>
        <div className="mini-controls">
          <button
            className="mini-play"
            aria-label={player.isPlaying ? 'Jeda' : 'Putar'}
            onClick={(e) => {
              e.stopPropagation()
              player.togglePlay()
            }}
          >
            <Icon name={player.isPlaying ? 'pause' : 'play'} size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
