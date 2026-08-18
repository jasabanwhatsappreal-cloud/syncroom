'use client'

import Icon from './Icons'

export default function Members({ members, hostId }) {
  if (!members || !members.length) {
    return <p className="empty-text">Tidak ada anggota.</p>
  }
  return (
    <div className="members">
      {members.map((m, i) => {
        const isHost = hostId && m.userId === hostId
        return (
          <div className="member-row" key={`${m.userId}-${i}`}>
            <div className="member-avatar">
              <span>{((m.username || 'G').slice(0, 1)).toUpperCase()}</span>
            </div>
            <div className="member-info">
              <span className="member-name">
                {m.username || 'Guest'}
                {isHost ? <span className="host-badge">HOST</span> : null}
              </span>
              <span className="member-presence">
                <span className={`presence-dot ${isHost ? 'host' : ''}`} /> Online
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}