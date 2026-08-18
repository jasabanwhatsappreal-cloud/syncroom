'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { generateRoomCode, sanitizeRoomCode } from '@/lib/room'

export default function HomePage() {
  const router = useRouter()
  const [codeInput, setCodeInput] = useState('')
  const [error, setError] = useState('')

  const createRoom = () => {
    router.push(`/room/${generateRoomCode()}?create=1`)
  }

  const joinRoom = (e) => {
    e.preventDefault()
    const code = sanitizeRoomCode(codeInput)
    if (!code) {
      setError('Masukkan kode room terlebih dahulu.')
      return
    }
    setError('')
    router.replace(`/room/${code}`)
  }

  return (
    <main className="home">
      <div className="home-inner">
        <div className="brand-head">
          <svg className="brand-logo" viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M9 9.5v5a1.5 1.5 0 0 0 3 0v-5a1.5 1.5 0 0 1 3 0v1.5" />
          </svg>
          <h1 className="brand-title">SyncRoom</h1>
        </div>
        <p className="tagline">Listen together.</p>

        <div className="home-actions">
          <button className="btn btn-primary btn-block" onClick={createRoom}>
            Buat Room
          </button>

          <form className="join-form" onSubmit={joinRoom}>
            <input
              className="input"
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              maxLength={6}
              placeholder="Masukkan kode room"
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value)
                setError('')
              }}
            />
            <button className="btn btn-secondary btn-block" type="submit">
              Join
            </button>
          </form>

          {error ? <p className="form-error">{error}</p> : null}
        </div>

        <p className="home-hint">
          Buat room, bagikan link, dan dengarkan lagu yang sama secara sinkron.
        </p>
      </div>
    </main>
  )
}