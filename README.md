# SyncRoom

Dengarkan musik bersama teman dalam satu room secara sinkron — ala Spotify Jam.

- Next.js 15 (App Router) + React 19
- JavaScript, CSS biasa (CSS Modules/plain CSS, tanpa Tailwind)
- Supabase Realtime (presence + broadcast) sebagai transport sync
- Drowify Music API sebagai sumber musik
- HTML5 `<audio>` murni, tanpa library audio

Target production: **https://hidaku.eu.cc** (Vercel + GitHub)

---

## Fitur

- Buat room → dapat room code 6 karakter → share link
- Join via link/kode (cukup username, tanpa login)
- Cari lagu (search, suggestion, hasil lagu/album/artis)
- Queue dengan add/remove/reorder (host)
- Player: play/pause/seek/next/previous, volume lokal
- Sinkronisasi playback lintas perangkat (play, pause, seek, track change, join-in-progress)
- Periodic sync + koreksi drift otomatis
- Presence member list + badge HOST
- Lyrics (synced & plain) dengan highlight otomatis
- Mode "Allow everyone to control" (opsional)
- Reconnect otomatis saat koneksi Realtime terputus
- UI dark, mobile-first, bottom sheet untuk Search/Queue/Lyrics/Members

## Struktur project

```
app/
  page.js                    # landing (buat/join room)
  room/[code]/page.js        # halaman room
  api/music/search/route.js  # proxy Drowify
  api/music/audio/route.js
  api/music/lyrics/route.js
  api/music/artist/route.js
  api/music/album/route.js
  api/music/suggest/route.js
  layout.js, globals.css, icon.svg
components/
  Room.jsx, Player.jsx, Search.jsx, Queue.jsx,
  Lyrics.jsx, Members.jsx, ShareRoom.jsx, Icons.jsx
lib/
  supabase.js      # Supabase client browser (anon key)
  room.js          # room code, userId, username helper
  sync.js          # server-time offset, compute target position
  music.js         # client music API + audio cache
  music-parser.js  # normalize respons Drowify
  drowify-server.js# server-only fetcher ke Drowify
  use-room.js      # hook utama (realtime, presence, audio, sync)
```

## Environment Variables

Buat `.env.local` dari `.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_PUBLIC_KEY
NEXT_PUBLIC_SITE_URL=https://hidaku.eu.cc   # opsional, untuk link share
```

> Jangan pernah commit `.env.local`. Sudah ada di `.gitignore`.

## Supabase Setup

1. Buat project baru di [supabase.com](https://supabase.com).
2. Copy **Project URL** dan **anon public key** (Settings → API). Jangan pakai `service_role`.
3. **(Opsional)** Database dipakai untuk persist room state agar room bertahan saat host offline. Jika di-skip, room tetap live selama host online.

SQL untuk tabel `rooms`:

```sql
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id text,
  state jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.rooms enable row level security;

create policy "rooms readable"
  on public.rooms for select
  using (true);

create policy "rooms insertable"
  on public.rooms for insert
  with check (true);

create policy "rooms updatable"
  on public.rooms for update
  using (true);
```

> Realtime **broadcast** dan **presence** bekerja secara default (tanpa DB). Untuk persist room, aktifkan Realtime pada tabel `rooms`:
> Database → Replication → enable `rooms` untuk `Send changed data` (INSERT/UPDATE), atau cukup gunakan broadcast seperti di atas.

## Local Development

```bash
npm install
cp .env.example .env.local
# isi NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Buka `http://localhost:3000`. Pastikan layanan `rooms` table diaktifkan untuk RLS policy di atas agar tidak terkena error permission.

## Build

```bash
npm run build
npm run start
```

## Vercel Deployment

1. Push repo ini ke GitHub.
2. Import project di [vercel.com/new](https://vercel.com/new). Framework preset: **Next.js** (otomatis terdeteksi).
3. Isi Environment Variables di Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL=https://hidaku.eu.cc` (opsional)
4. Deploy.

> Tidak perlu VPS / custom server / WebSocket. Semua kompatibel dengan Vercel Serverless.

## Custom Domain (hidaku.eu.cc)

1. Vercel → Project → Settings → Domains → **Add Domain**.
2. Masukkan `hidaku.eu.cc`.
3. Ikuti nilai DNS yang diberikan Vercel (biasanya CNAME `cname.vercel-dns.com` atau A record). **Jangan hardcode** nilai DNS — selalu pakai yang ditampilkan Vercel karena bisa berubah.

## Drowify API

Base: `https://drowify-music.biz.id`. Seluruh panggilan melalui proxy route `/api/music/*` (server-side), bukan dari browser, sehingga base URL tidak tersebar dan timeout/error ditangani terpusat.

**Catatan:** endpoint `/api/ytplay` (untuk stream audio) bisa lambat / tidak stabil. Jika gagal, UI menampilkan error dan tombol "Coba Lagi". Audio URL di-cache di memori browser (`Map()`).

## Known Limitations

- Room state dipertahankan via broadcast realtime + (opsional) tabel `rooms`. Jika semua user keluar dan tidak ada persist DB, room akan hilang.
- Autoplay diblokir browser: user harus menekan tombol "Sinkronkan & Play" (gesture). Ini normal di mobile.
- Drowify `/api/ytplay` kadang lambat; join-in-progress bisa gagal sementara jika audio source belum siap (ada retry + tombol coba lagi).
- Tidak ada autentikasi; host ditentukan dari `hostId` di room state.
- Jika Supabase tidak dikonfigurasi, halaman menampilkan error setup.