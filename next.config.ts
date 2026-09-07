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
  // Chuyển trang VPP về /vpp/* (Phase 2). Giữ redirect từ đường cũ để không gãy
  // liên kết đã lỡ lưu (tạm thời — permanent:false).
  async redirects() {
    return [
      { source: '/dang-ky', destination: '/vpp/dang-ky', permanent: false },
      { source: '/phieu', destination: '/vpp/phieu', permanent: false },
      { source: '/phieu/:path*', destination: '/vpp/phieu/:path*', permanent: false },
      { source: '/thong-ke', destination: '/vpp/thong-ke', permanent: false },
      { source: '/tong-quan', destination: '/vpp', permanent: false },
      { source: '/admin/san-pham', destination: '/vpp/san-pham', permanent: false },
      { source: '/admin/cap-nhat-gia', destination: '/vpp/cap-nhat-gia', permanent: false },
    ]
  },
}

export default nextConfig
