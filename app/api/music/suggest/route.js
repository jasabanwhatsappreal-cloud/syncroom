import { drowifyGet } from '@/lib/drowify-server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim().slice(0, 80)

  if (!q) {
    return Response.json([])
  }

  try {
    const data = await drowifyGet(`/api/suggest?q=${encodeURIComponent(q)}`)
    if (!Array.isArray(data)) {
      return Response.json([])
    }
    return Response.json(data.map((s) => String(s)).slice(0, 8))
  } catch (err) {
    return Response.json([])
  }
}