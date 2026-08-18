'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { searchMusic, getSuggestion } from '@/lib/music'
import Icon from './Icons'

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

function Thumb({ src, size = 44 }) {
  if (!src) {
    return (
      <div className="thumb-placeholder" style={{ width: size, height: size }}>
        <Icon name="headphones" size={size * 0.5} />
      </div>
    )
  }
  return (
    <div className="thumb" style={{ width: size, height: size }}>
      <img src={src} alt="" loading="lazy" />
    </div>
  )
}

export default function Search({ canAdd, onAdd }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [results, setResults] = useState(null)
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef(null)

  const runSuggest = useCallback((q) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const clean = q.trim()
    if (!clean) {
      setSuggestions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await getSuggestion(clean)
        setSuggestions(Array.isArray(data) ? data : [])
      } catch (e) {
        setSuggestions([])
      }
    }, 350)
  }, [])

  useEffect(() => {
    runSuggest(query)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, runSuggest])

  const doSearch = useCallback(async (q) => {
    const clean = (q || query).trim()
    if (!clean) return
    setLoadingSearch(true)
    setError('')
    setQuery(clean)
    setSuggestions([])
    try {
      const data = await searchMusic(clean)
      setResults(data || {})
    } catch (e) {
      setError('Gagal mengambil data musik. Coba lagi.')
      setResults(null)
    } finally {
      setLoadingSearch(false)
    }
  }, [query])

  const songs = (results && (results.songs || [])) || []
  const albums = (results && (results.albums || [])) || []
  const artists = (results && (results.artists || [])) || []

  return (
    <div className="search">
      <div className="search-bar">
        <Icon name="search" size={18} />
        <input
          className="input search-input"
          type="text"
          placeholder="Search music..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Go') {
              e.preventDefault()
              doSearch(query)
            }
          }}
        />
      </div>

      {suggestions.length > 0 && !results ? (
        <div className="suggestions">
          {suggestions.map((s, i) => (
            <button
              key={i}
              className="suggestion"
              onClick={() => doSearch(s)}
            >
              <Icon name="search" size={15} />
              <span>{s}</span>
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="api-error">{error}</p> : null}

      {loadingSearch ? <p className="loading-text">Mencari...</p> : null}

      {results ? (
        <div className="search-results">
          {songs.length > 0 ? (
            <div className="result-section">
              <div className="result-heading">Lagu</div>
              {songs.map((t, i) => (
                <div className="result-row" key={`s-${t.videoId || i}`}>
                  <Thumb src={t.thumbnail} />
                  <div className="result-main">
                    <div className="result-title">{t.title}</div>
                    <div className="result-sub">{t.artist}</div>
                  </div>
                  <div className="result-side">
                    <span className="result-dur">{formatDuration(t.duration)}</span>
                    {canAdd ? (
                      <button
                        className="add-btn"
                        onClick={() => onAdd(t)}
                        title="Tambah ke queue"
                        aria-label="Tambah ke queue"
                      >
                        <Icon name="plus" size={16} />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {albums.length > 0 ? (
            <>
              <div className="result-heading">Album</div>
              <div className="result-grid">
                {albums.map((a, i) => (
                  <div className="result-card" key={`a-${a.id || i}`}>
                    <Thumb src={a.cover} size={64} />
                    <div className="result-card-text">
                      <div className="result-title">{a.title}</div>
                      <div className="result-sub">{a.artist}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {artists.length > 0 ? (
            <>
              <div className="result-heading">Artis</div>
              <div className="result-grid">
                {artists.map((a, i) => (
                  <div className="result-card" key={`at-${a.id || i}`}>
                    <Thumb src={a.cover} size={64} />
                    <div className="result-card-text">
                      <div className="result-title">{a.title}</div>
                      <div className="result-sub">{a.artist}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {!loadingSearch && songs.length === 0 && albums.length === 0 && artists.length === 0 ? (
            <p className="empty-text">Tidak ada hasil untuk pencarian ini.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}