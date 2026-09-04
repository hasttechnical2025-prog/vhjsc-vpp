import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Ảnh sản phẩm nằm trên Supabase Storage (public). Cho phép <Image> tải từ đó.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
  // pdfmake dùng ở server (API route) — để Next đóng gói như package ngoài.
  serverExternalPackages: ['pdfmake'],
}

export default nextConfig
