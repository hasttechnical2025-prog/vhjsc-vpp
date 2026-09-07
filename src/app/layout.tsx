import type { Metadata, Viewport } from 'next'
import './globals.css'
import VersionWatcher from '@/components/VersionWatcher'

export const metadata: Metadata = {
  title: 'VHJSC · Đăng ký Văn phòng phẩm',
  description: 'Lập phiếu đề xuất mua văn phòng phẩm theo phòng ban',
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
