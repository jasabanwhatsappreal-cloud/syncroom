import './globals.css'

export const metadata = {
  title: 'SyncRoom — Listen together',
  description: 'Dengarkan musik bersama teman dalam satu room, sinkron realtime.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://hidaku.eu.cc'),
  openGraph: {
    title: 'SyncRoom — Listen together',
    description: 'Dengarkan musik bersama teman dalam satu room.',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0b0b10',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}