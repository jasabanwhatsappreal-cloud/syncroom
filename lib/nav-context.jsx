'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const NavContext = createContext(null)

export function NavProvider({ children }) {
  const [view, setView] = useState('home')
  const [detail, setDetail] = useState(null)

  const openAlbum = useCallback((id, title, cover) => {
    setDetail({ type: id && id.startsWith('MPREb_') ? 'album' : 'playlist', id, title, cover })
  }, [])

  const openPlaylist = useCallback((id, title, cover) => {
    setDetail({ type: 'playlist', id, title, cover })
  }, [])

  const openArtist = useCallback((id, name, cover) => {
    setDetail({ type: 'artist', id, name, cover })
  }, [])

  const openLiked = useCallback(() => {
    setDetail({ type: 'liked' })
  }, [])

  const openLocalPlaylist = useCallback((id) => {
    setDetail({ type: 'localPlaylist', id })
  }, [])

  const closeDetail = useCallback(() => setDetail(null), [])

  const go = useCallback((v) => setView(v), [])

  const value = useMemo(
    () => ({
      view,
      go,
      detail,
      openAlbum,
      openPlaylist,
      openArtist,
      openLiked,
      openLocalPlaylist,
      closeDetail,
    }),
    [view, detail, go, openAlbum, openPlaylist, openArtist, openLiked, openLocalPlaylist, closeDetail]
  )

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>
}

export function useNav() {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav must be used within NavProvider')
  return ctx
}
