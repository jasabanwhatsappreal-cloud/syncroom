'use client'

import { useEffect, useRef, useState } from 'react'
import { NavProvider, useNav } from '@/lib/nav-context'
import { PlayerProvider, usePlayer } from '@/lib/player-context'
import HomeView from './HomeView'
import SearchView from './SearchView'
import LibraryView from './LibraryView'
import RoomLanding from './RoomLanding'
import MiniPlayer from './MiniPlayer'
import FullPlayer from './FullPlayer'
import LyricsOverlay from './LyricsOverlay'
import DetailOverlay from './DetailOverlay'
import Icon from './Icons'

const NAV_ITEMS = [
  { key: 'home', label: 'Beranda', icon: 'home' },
  { key: 'search', label: 'Cari', icon: 'search' },
  { key: 'library', label: 'Library', icon: 'library' },
  { key: 'room', label: 'Room', icon: 'users' },
]

function BottomNav() {
  const nav = useNav()
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.key}
          className={`nav-item ${nav.view === item.key ? 'active' : ''}`}
          onClick={() => nav.go(item.key)}
        >
          <span className="nav-icon">
            <Icon name={item.icon} size={20} />
          </span>
          {item.label}
        </button>
      ))}
    </nav>
  )
}

function Splash({ hide }) {
  return (
    <div className={`splash ${hide ? 'hide' : ''}`} aria-hidden="true">
      <div className="splash-rings">
        <span />
        <span />
        <span />
        <span />
        <div className="splash-disc" />
        <div className="splash-logo-wrap">
          <img src="/icon.svg" alt="" />
        </div>
      </div>
      <div className="splash-title">SyncRoom</div>
      <div className="splash-sub">Listen together</div>
      <div className="splash-bar">
        <i />
      </div>
    </div>
  )
}

function Shell() {
  const nav = useNav()
  const player = usePlayer()
  const [splashHide, setSplashHide] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => setSplashHide(true), 2300)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [nav.view])

  const showMini = player.track && !player.fullOpen && nav.view !== 'room'

  return (
    <main className="app-main">
      <Splash hide={splashHide} />

      <div ref={scrollRef} className={`view-scroll ${showMini ? '' : 'no-mini'}`}>
        {nav.view === 'home' ? <HomeView /> : null}
        {nav.view === 'search' ? <SearchView /> : null}
        {nav.view === 'library' ? <LibraryView /> : null}
        {nav.view === 'room' ? <RoomLanding /> : null}
      </div>

      <BottomNav />
      {showMini ? <MiniPlayer /> : null}
      {nav.detail ? <DetailOverlay /> : null}
      {player.fullOpen ? <FullPlayer /> : null}
      {player.lyricsOpen ? <LyricsOverlay /> : null}
    </main>
  )
}

export default function AppShell() {
  return (
    <NavProvider>
      <PlayerProvider>
        <Shell />
      </PlayerProvider>
    </NavProvider>
  )
}