'use client'

import { useState } from 'react'
import useRoom from '@/lib/use-room'
import Player from './Player'
import Search from './Search'
import Queue from './Queue'
import Lyrics from './Lyrics'
import Members from './Members'
import ShareRoom from './ShareRoom'
import Icon from './Icons'

export default function Room({ code, create }) {
  const room = useRoom(code, create)
  const [usernameInput, setUsernameInput] = useState('')
  const [mobileView, setMobileView] = useState(null)

  if (room.status === 'error') {
    return (
      <main className="home">
        <div className="home-inner">
          <h1 className="brand-title">SyncRoom</h1>
          <p className="form-error">{room.error}</p>
          <div className="home-actions">
            <a className="btn btn-primary btn-block" href="/">
              Kembali
            </a>
          </div>
        </div>
      </main>
    )
  }

  if (room.status === 'need-username') {
    return (
      <main className="home join-screen">
        <div className="home-inner">
          <h1 className="brand-title">SyncRoom</h1>
          <p className="tagline">
            Bergabung ke room <strong className="code-chip">{code}</strong>
          </p>
          <form
            className="home-actions join-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (usernameInput.trim()) room.submitUsername(usernameInput)
            }}
          >
            <input
              className="input"
              type="text"
              maxLength={24}
              autoComplete="nickname"
              placeholder="Masukkan nama"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              autoFocus
            />
            <button className="btn btn-primary btn-block" type="submit">
              Join Room
            </button>
          </form>
        </div>
      </main>
    )
  }

  if (room.status === 'not-found') {
    return (
      <main className="home">
        <div className="home-inner">
          <h1 className="brand-title">SyncRoom</h1>
          <p className="form-error">Room tidak ditemukan.</p>
          <div className="home-actions">
            <a className="btn btn-primary btn-block" href="/">
              Kembali
            </a>
          </div>
        </div>
      </main>
    )
  }

  if (room.status === 'loading' || room.status === 'waiting') {
    return (
      <main className="home">
        <div className="home-inner">
          <p className="loading-text">
            {room.status === 'waiting'
              ? `Menunggu host di room ${code} berbagi state...`
              : `Menghubungkan ke room ${code}...`}
          </p>
        </div>
      </main>
    )
  }

  const st = room.roomState || {}
  const track = st.currentTrack || null
  const playlist = st.playlist || []

  const openSheet = (view) => setMobileView(view)
  const closeSheet = () => setMobileView(null)

  const sheetProps = {
    canAdd: room.canControl,
    onAdd: (t) => {
      room.addToQueue(t)
      closeSheet()
    },
  }

  return (
    <div className="room">
      <audio ref={room.audioRef} preload="auto" />

      <header className="room-header">
        <div className="header-brand">
          <svg className="brand-logo" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M9 9.5v5a1.5 1.5 0 0 0 3 0v-5a1.5 1.5 0 0 1 3 0v1.5" />
          </svg>
          <span className="header-name">SyncRoom</span>
          <span className="code-chip">{code}</span>
        </div>
        <div className="header-actions">
          <span className={`conn ${room.connectionStatus === 'connected' ? 'ok' : 'reconnect'}`}>
            {room.connectionStatus === 'connected' ? 'Connected' : 'Reconnecting...'}
          </span>
          <ShareRoom code={code} />
        </div>
      </header>

      {room.isHost ? (
        <label className="allow-control">
          <input
            type="checkbox"
            checked={Boolean(st.allowEveryoneControl)}
            onChange={(e) => room.setAllowEveryoneControl(e.target.checked)}
          />
          <span>Allow everyone to control</span>
        </label>
      ) : null}

      <div className="room-body">
        <section className="now-section">
          <Player
            track={track}
            isPlaying={room.isPlaying}
            position={room.position}
            duration={room.duration}
            volume={room.volume}
            setVolume={room.setVolume}
            togglePlay={room.togglePlay}
            seekTo={room.seekTo}
            next={room.next}
            prev={room.prev}
            canControl={room.canControl}
            audioError={room.audioError}
            retryAudio={room.retryAudio}
            audioPreparing={room.audioPreparing}
            needsUnlock={room.needsUnlock}
            unlockPlayback={room.unlockPlayback}
          />
        </section>

        <nav className="sheet-nav">
          <button className="sheet-nav-btn" onClick={() => openSheet('search')}>
            <Icon name="search" size={18} /> Search
          </button>
          <button className="sheet-nav-btn" onClick={() => openSheet('queue')}>
            <Icon name="queue" size={18} /> Queue
          </button>
          <button className="sheet-nav-btn" onClick={() => openSheet('lyrics')}>
            <Icon name="lyrics" size={18} /> Lyrics
          </button>
          <button className="sheet-nav-btn" onClick={() => openSheet('members')}>
            <Icon name="users" size={18} /> Members
          </button>
        </nav>
      </div>

      {mobileView ? (
        <div className="sheet-backdrop" onClick={closeSheet}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <button className="sheet-close" onClick={closeSheet}>
                <Icon name="close" size={20} />
              </button>
              <h2 className="sheet-title">
                {mobileView === 'search'
                  ? 'Search'
                  : mobileView === 'queue'
                  ? 'Queue'
                  : mobileView === 'lyrics'
                  ? 'Lyrics'
                  : 'Members'}
              </h2>
            </div>
            <div className="sheet-body">
              {mobileView === 'search' ? <Search {...sheetProps} /> : null}
              {mobileView === 'queue' ? (
                <Queue
                  playlist={playlist}
                  currentTrack={track}
                  canControl={room.canControl}
                  onRemove={room.removeFromQueue}
                  onReorder={room.reorderQueue}
                  onSelect={(i) => {
                    if (room.canControl && playlist[i]) {
                      room.changeTrack(playlist[i], true)
                      closeSheet()
                    }
                  }}
                />
              ) : null}
              {mobileView === 'lyrics' ? (
                <Lyrics track={track} audioRef={room.audioRef} isPlaying={room.isPlaying} />
              ) : null}
              {mobileView === 'members' ? <Members members={room.members} hostId={st.hostId} /> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}