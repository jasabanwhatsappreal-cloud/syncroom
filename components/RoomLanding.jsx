'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePlayer } from '@/lib/player-context'
import { generateRoomCode, sanitizeRoomCode, isValidRoomCode } from '@/lib/room'
import Icon from './Icons'

export default function RoomLanding() {
  const router = useRouter()
  const player = usePlayer()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  const createRoom = () => {
    player.pause()
    router.push(`/room/${generateRoomCode()}?create=1`)
  }

  const joinRoom = (e) => {
    e.preventDefault()
    const clean = sanitizeRoomCode(code)
    if (!isValidRoomCode(clean)) {
      setError('Masukkan kode 6 karakter yang valid.')
      return
    }
    setError('')
    player.pause()
    router.push(`/room/${clean}`)
  }

  return (
    <div className="room-landing">
      <h1>Room</h1>
      <p>Dengarkan bersama teman secara sinkron, atau lanjutkan menikmati musik sendiri.</p>

      <div className="room-create-card" onClick={createRoom} role="button" tabIndex={0}>
        <h3>Buat Room Baru</h3>
        <p>Mudah, tanpa login. Bagikan kode ke temanmu.</p>
      </div>

      <div className="room-join-card">
        <h3>Gabung ke Room</h3>
        <form className="join-form" onSubmit={joinRoom}>
          <input
            className="input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XXXXXX"
            maxLength={6}
            autoComplete="off"
            spellCheck={false}
          />
          {error ? <p className="form-error">{error}</p> : null}
          <button className="btn btn-secondary" type="submit">
            <Icon name="users" size={16} />
            Gabung
          </button>
        </form>
      </div>
    </div>
  )
}