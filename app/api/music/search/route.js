import { drowifyGet, apiError } from '@/lib/drowify-server'
import {
  normalizeSongs,
  normalizeAlbums,
  normalizeArtists,
  normalizePlaylists,
} from '@/lib/music-parser'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const query = (searchParams.get('query') || '').trim()
  const type = searchParams.get('type') || 'all'

  if (!query || query.length > 120) {
    return Response.json({ error: 'Query tidak valid' }, { status: 400 })
  }

  try {
    const data = await drowifyGet(`/api/search?query=${encodeURIComponent(query)}&type=${type}`)
    if (!data || data.status === false) {
      return Response.json({ error: 'Gagal mengambil data musik.' }, { status: 502 })
    }
    const result = data.result || {}
    return Response.json({
      songs: normalizeSongs(result.songs),
      albums: normalizeAlbums(result.albums),
      artists: normalizeArtists(result.artists),
      playlists: normalizePlaylists(result.playlists),
    })
  } catch (err) {
    if (err && err.name === 'AbortError') {
      return Response.json({ error: 'Waktu permintaan habis.' }, { status: 504 })
    }
    return Response.json({ error: 'Gagal mengambil data musik. Coba lagi.' }, { status: 502 })
  }
}