'use client'

import { useState } from 'react'
import Icon from './Icons'
import { formatDuration } from './Search'

export default function Queue({ playlist, currentTrack, canControl, onRemove, onReorder, onSelect }) {
  const [dragIdx, setDragIdx] = useState(null)

  const move = (from, to) => {
    if (from === to || to == null) return
    onReorder(from, to)
  }

  return (
    <div className="queue">
      {!playlist.length ? (
        <p className="empty-text">Queue kosong. Cari lagu dan tambahkan.</p>
      ) : (
        <div className="queue-list">
          {playlist.map((t, i) => {
            const active = currentTrack && currentTrack.videoId === t.videoId
            return (
              <div key={`${t.videoId}-${i}`} className={`queue-row ${active ? 'active' : ''}`}>
                {canControl ? (
                  <button
                    className="grip-btn"
                    draggable
                    onDragStart={() => setDragIdx(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      move(dragIdx, i)
                      setDragIdx(null)
                    }}
                    onDragEnd={() => setDragIdx(null)}
                    title="Seret untuk reorder"
                  >
                    <Icon name="grip" size={16} />
                  </button>
                ) : null}
                <div className="queue-main" onClick={() => canControl && onSelect && onSelect(i)}>
                  <div className="queue-title">
                    {i + 1}. {t.title}
                  </div>
                  <div className="queue-sub">{t.artist}</div>
                </div>
                <span className="queue-dur">{formatDuration(t.duration)}</span>
                {canControl ? (
                  <button
                    className="remove-btn"
                    onClick={() => onRemove(i)}
                    title="Hapus dari queue"
                    aria-label="Hapus"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}