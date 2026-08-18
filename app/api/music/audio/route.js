import { drowifyPost } from '@/lib/drowify-server'
import { normalizeAudio } from '@/lib/music-parser'

export const maxDuration = 60

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch (e) {
    return Response.json({ error: 'Permintaan tidak valid.' }, { status: 400 })
  }

  const videoId = String(body.videoId || '').trim()
  if (!videoId || videoId.length > 32 || !/^[A-Za-z0-9_-]+$/.test(videoId)) {
    return Response.json({ error: 'Video ID tidak valid.' }, { status: 400 })
  }

  try {
    const data = await drowifyPost('/api/ytplay', {
      query: `https://youtube.com/watch?v=${videoId}`,
    })
    if (!data || data.status === false) {
      return Response.json({ error: 'Gagal mengambil audio.' }, { status: 502 })
    }
    const audio = normalizeAudio(data.result)
    if (!audio.audioUrl) {
      return Response.json({ error: 'Audio tidak tersedia.' }, { status: 502 })
    }
    return Response.json(audio)
  } catch (err) {
    if (err && err.name === 'AbortError') {
      return Response.json({ error: 'Waktu permintaan habis.' }, { status: 504 })
    }
    return Response.json({ error: 'Gagal mengambil audio. Coba lagi.' }, { status: 502 })
  }
}