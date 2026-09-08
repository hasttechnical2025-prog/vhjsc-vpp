import type { Metadata, Viewport } from 'next'
import './globals.css'
import VersionWatcher from '@/components/VersionWatcher'

export const metadata: Metadata = {
  title: 'VHJSC - Dịch vụ Hành chính',
  description: 'Cổng dịch vụ hành chính VHJSC: đăng ký VPP, nhà cung cấp…',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        {children}
        <VersionWatcher current={process.env.VERCEL_GIT_COMMIT_SHA || 'dev'} />
      </body>
    </html>
  )
}
