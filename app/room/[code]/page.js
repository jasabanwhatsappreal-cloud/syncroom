'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { sanitizeRoomCode } from '@/lib/room'
import Room from '@/components/Room'

export default function RoomPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const rawCode = String(params.code || '').trim()
  const code = sanitizeRoomCode(rawCode)
  const create = searchParams.get('create') === '1'

  const [invalid, setInvalid] = useState(false)
  const shownRef = useRef(false)

  useEffect(() => {
    if (!code && !shownRef.current) {
      shownRef.current = true
      setInvalid(true)
    }
  }, [code])

  if (invalid || !code) {
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

  return <Room code={code} create={create} />
}