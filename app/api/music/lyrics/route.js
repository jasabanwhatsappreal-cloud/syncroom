import { drowifyGet } from '@/lib/drowify-server'
import { normalizeLyrics } from '@/lib/music-parser'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const videoId = (searchParams.get('id') || '').trim()
  const title = (searchParams.get('title') || '').trim().slice(0, 200)
  const artist = (searchParams.get('artist') || '').trim().slice(0, 200)

  if (!videoId || videoId.length > 32) {
    return Response.json({ error: 'Video ID tidak valid.' }, { status: 400 })
  }

  try {
    const data = await drowifyGet(
      `/api/lyrics?id=${encodeURIComponent(videoId)}&title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`
    )
    if (!data || data.status === false) {
      return Response.json({ plainLyrics: '', syncedLyrics: null })
    }
    return Response.json(normalizeLyrics(data.result))
  } catch (err) {
    if (err && err.name === 'AbortError') {
      return Response.json({ error: 'Waktu permintaan habis.' }, { status: 504 })
    }
    return Response.json({ plainLyrics: '', syncedLyrics: null })
  }
}