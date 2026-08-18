import { drowifyGet } from '@/lib/drowify-server'
import { normalizeSongs } from '@/lib/music-parser'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const id = (searchParams.get('id') || '').trim()

  if (!id || id.length > 64) {
    return Response.json({ error: 'ID tidak valid.' }, { status: 400 })
  }

  try {
    const data = await drowifyGet(`/api/album?id=${encodeURIComponent(id)}`)
    const result = data && data.result ? data.result : {}
    return Response.json({
      id: result.id || id,
      title: result.title || '',
      description: result.description || '',
      thumbnails: result.thumbnails || [],
      songs: normalizeSongs(result.songs),
    })
  } catch (err) {
    if (err && err.name === 'AbortError') {
      return Response.json({ error: 'Waktu permintaan habis.' }, { status: 504 })
    }
    return Response.json({ error: 'Gagal mengambil data album.' }, { status: 502 })
  }
}