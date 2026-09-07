import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Trả mã bản build hiện tại trên server (Vercel tự đặt VERCEL_GIT_COMMIT_SHA mỗi lần deploy).
// Client so mã này với mã lúc tải trang; khác nhau = có bản mới.
export async function GET() {
  const version = process.env.VERCEL_GIT_COMMIT_SHA || 'dev'
  return NextResponse.json(
    { version },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  )
}
