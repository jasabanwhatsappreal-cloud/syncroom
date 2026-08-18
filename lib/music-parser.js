// Normalize Drowify API responses into the app's internal track format.
// Handles several real response shapes observed from the API.

export function pickThumbnail(value) {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string') return item
      if (item && typeof item.url === 'string') return item.url
    }
    return ''
  }
  if (typeof value === 'object') {
    return value.url || value.thumbnail || ''
  }
  return ''
}

export function normalizeTrack(raw) {
  if (!raw || typeof raw !== 'object') return null
  const videoId = raw.videoId || raw.id || ''
  const title = raw.title || raw.name || 'Unknown'
  const artist = raw.artist || raw.artists || raw.artistName || 'Unknown'
  const thumbnail =
    pickThumbnail(raw.thumbnail) ||
    pickThumbnail(raw.thumbnails) ||
    pickThumbnail(raw.cover) ||
    ''
  const duration = raw.duration || raw.durationSec || ''
  return {
    videoId,
    title,
    artist,
    thumbnail,
    duration,
  }
}

export function normalizeSongs(songs = []) {
  if (!Array.isArray(songs)) return []
  return songs.map(normalizeTrack).filter(Boolean)
}

export function normalizeArtists(artists = []) {
  if (!Array.isArray(artists)) return []
  return artists
    .map((a) => ({
      id: a.id || '',
      title: a.title || a.name || 'Unknown',
      artist: a.artist || '',
      cover: pickThumbnail(a.cover || a.thumbnail || a.thumbnails),
    }))
    .filter((a) => a.id)
}

export function normalizeAlbums(albums = []) {
  if (!Array.isArray(albums)) return []
  return albums
    .map((a) => ({
      id: a.id || '',
      title: a.title || 'Unknown',
      artist: a.artist || '',
      albumType: a.albumType || '',
      year: a.year || '',
      cover: pickThumbnail(a.cover || a.thumbnail || a.thumbnails),
    }))
    .filter((a) => a.id)
}

export function normalizePlaylists(playlists = []) {
  if (!Array.isArray(playlists)) return []
  return playlists
    .map((p) => ({
      id: p.id || '',
      title: p.title || 'Unknown',
      artist: p.artist || '',
      cover: pickThumbnail(p.cover || p.thumbnail || p.thumbnails),
    }))
    .filter((p) => p.id)
}

// Lyrics responses vary: some have `lyrics.lines`, some have plain text.
export function normalizeLyrics(result) {
  const empty = { plainLyrics: '', syncedLyrics: null }
  if (!result || typeof result !== 'object') return empty
  const lyrics = result.lyrics || result

  // synced: lines array with { time, text }
  if (lyrics.type === 'synced' && Array.isArray(lyrics.lines)) {
    return {
      plainLyrics: lyrics.lines.map((l) => l.text || '').join('\n'),
      syncedLyrics: lyrics.lines
        .map((l) => ({ time: Number(l.time) || 0, text: l.text || '' }))
        .filter((l) => l.text),
    }
  }

  // plain lyrics
  if (typeof lyrics === 'string') {
    return { plainLyrics: lyrics, syncedLyrics: null }
  }
  if (Array.isArray(lyrics.lines)) {
    const first = lyrics.lines[0]
    if (first && typeof first === 'string') {
      return { plainLyrics: lyrics.lines.join('\n'), syncedLyrics: null }
    }
    return {
      plainLyrics: lyrics.lines.map((l) => l.text || '').join('\n'),
      syncedLyrics: null,
    }
  }

  return empty
}

export function normalizeAudio(result) {
  if (!result || typeof result !== 'object') return { audioUrl: '', duration: '' }
  const download = result.download || result.audio || {}
  let audioUrl = ''
  if (typeof download === 'string') audioUrl = download
  else if (download && typeof download.audio === 'string') audioUrl = download.audio
  else if (download && typeof download.url === 'string') audioUrl = download.url
  return {
    audioUrl,
    duration: result.duration || '',
  }
}