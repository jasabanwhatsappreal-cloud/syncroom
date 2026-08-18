'use client'

const PATHS = {
  music: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  play: 'M8 5v14l11-7z',
  pause: 'M6 5h4v14H6zM14 5h4v14h-4z',
  prev: 'M6 6h2v12H6zM20 6l-10 6 10 6z',
  next: 'M16 6h2v12h-2zM4 6l10 6-10 6z',
  search: 'M11 19a8 8 0 1 1 5.29-2.29L21 21l-1.4 1.4-4.73-4.71A8 8 0 0 1 11 19zm0-2a6 6 0 1 0 0-12 6 6 0 0 0 0 12z',
  queue: 'M3 6h13v2H3zM3 11h9v2H3zM3 16h9v2H3zM16 16l6 3-6 3z',
  lyrics: 'M4 5h16v2H4zM4 10h16v2H4zM4 15h10v2H4zM17 15l4 2-4 2z',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0-2a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM3 20a6 6 0 0 1 12 0h-2a4 4 0 0 0-8 0H3zM16 4h.5a3.5 3.5 0 0 1 0 7H16v-2h.5a1.5 1.5 0 0 0 0-3H16V4zm0 8h3a2 2 0 0 1 2 2v1h-2v-1h-3v-2z',
  share: 'M14 5l7 8-7 8v-4c-4 0-8 1-10 4 1-5 4-8 10-9V5z',
  plus: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z',
  trash: 'M9 3h6l1 2h4v2H4V5h4l1-2zM6 9h12l-1 12H7L6 9zm3 2v8h2v-8H9zm4 0v8h2v-8h-2z',
  copy: 'M9 9h11v11H9zM4 15H3V4h11v1H5v10z',
  close: 'M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6z',
  volume: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z',
  volumeOff: 'M3 9v6h4l5 5V4L7 9H3zm14 3 3-3 1.4 1.4L18.4 13l3 3L20 17.4l-3-3-3 3L12.6 16z',
  grip: 'M9 5.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM9 10.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM9 15.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z',
  headphones: 'M4 13a8 8 0 0 1 16 0v3h-3v-6h3V15a3 3 0 0 1-6 0v-2H8v2a3 3 0 0 1-6 0zM4 16a3 3 0 0 0 3 3v-2h-3z',
  spinner: 'M12 3a9 9 0 1 0 9 9h-2.5A6.5 6.5 0 1 1 12 5.5V3z',
  heart: 'M12 21s-7.5-4.8-10-9.3C.5 8.4 2.3 4.5 6 4.2c2.2-.2 4.1 1 6 3.3 1.9-2.3 3.8-3.5 6-3.3 3.7.3 5.5 4.2 4 7.5C19.5 16.2 12 21 12 21z',
  heartOutline: 'M12 20.3s-7.3-4.7-9.8-9.1C.7 8.1 2.4 4 6.2 3.7c2.2-.2 4 1 5.8 3.3 1.8-2.3 3.6-3.5 5.8-3.3 3.8.3 5.5 4.4 4 7.5-2.5 4.4-9.8 9.1-9.8 9.1zM12 6.4c-1.3-1.6-2.8-2.6-4.5-2.4-2.5.2-3.9 3.1-2.6 5.3 1.6 2.8 5.2 5.4 7.1 6.6 1.9-1.2 5.5-3.8 7.1-6.6 1.3-2.2-.1-5.1-2.6-5.3-1.7-.2-3.2.8-4.5 2.4z',
  shuffle: 'M16 3h5v5h-2V6.4l-3.3 3.3-1.4-1.4L17.6 5H16V3zm-9 0H2v2h5v2H5L1.4 3.4 0 4.8 3.6 8.4H2v2h5V8.4L5.6 6.8 8 4.4V3zm13 4.6 2 2L19 12.2V10h-5V8h5V7.6zM9.2 17H5v-2H3v2H0l2.5-3L0 10h3v2h4.2L8 13.4 9.2 15H11v2H9.2zm8.8-2.6L20 16l-2 2V15.6h-3V13h3v1.4zm0-1.4v-2h-3V9h3V7.6L22 10l-4 3z',
  list: 'M4 6h16v2H4zM4 11h16v2H4zM4 16h10v2H4z',
  home: 'M12 3 4 9v12h5v-6h6v6h5V9z',
  homeOutline: 'M12 4.5 5 9.7V19h4v-5h6v5h4V9.7l-7-5.2z',
  compass: 'M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm4-12-2.5 6-6 2.5 2.5-6z',
  library: 'M4 4h3v16H4zM9 6h3v14H9zM14 8h3v12h-3zM19 10h1v10h-1z',
  musicNote: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
}

export default function Icon({ name, size = 20, className = '', spin = false }) {
  const d = PATHS[name] || PATHS.music
  return (
    <svg
      className={`icon ${spin ? 'spin' : ''} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}

export { PATHS }