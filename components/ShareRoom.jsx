'use client'

import { useState } from 'react'
import Icon from './Icons'
import { getRoomUrl } from '@/lib/room'

export default function ShareRoom({ code }) {
  const [copied, setCopied] = useState(false)
  const url = getRoomUrl(code)

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SyncRoom',
          text: `Ikut dengar musik bareng di room ${code}`,
          url,
        })
        return
      } catch (e) {
        /* user cancelled or share failed - fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      /* clipboard unavailable */
    }
  }

  return (
    <button className="btn btn-ghost share-btn" onClick={share} title="Share room">
      <Icon name="share" size={16} />
      <span>{copied ? 'Tersalin' : 'Share'}</span>
    </button>
  )
}