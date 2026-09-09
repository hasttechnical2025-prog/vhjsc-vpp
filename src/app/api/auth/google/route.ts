import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

export const runtime = 'nodejs'

// Khởi động đăng nhập Google BẰNG CHÍNH TÊN MIỀN CỦA APP.
// Tự dựng URL consent của Google, redirect_uri trỏ về /auth/callback của app
// (không qua Supabase) → màn hình Google hiện "…tới <tên miền công ty>".
export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const origin = request.nextUrl.origin
  if (!clientId) {
    return NextResponse.redirect(new URL('/login?loi=oauth', origin))
  }

  const state = randomBytes(16).toString('hex')
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/auth/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state,
  })

  const res = NextResponse.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + params.toString())
  // state chống CSRF: giữ ngắn hạn trong cookie httpOnly, callback đối chiếu lại.
  res.cookies.set('g_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  })
  return res
}
