import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createSessionToken, type Role } from '@/lib/session'

export const runtime = 'nodejs'

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

// Đọc phần payload của id_token (JWT). id_token lấy TRỰC TIẾP từ token endpoint
// của Google qua HTTPS nên tin cậy được, chỉ cần giải mã payload (không cần verify
// chữ ký lại). Vẫn kiểm tra aud + email_verified cho chắc.
function docPayload(idToken: string): { email?: string; email_verified?: boolean; aud?: string } | null {
  try {
    const p = idToken.split('.')[1]
    const json = Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    return JSON.parse(json)
  } catch {
    return null
  }
}

// Callback đăng nhập Google (luồng authorization code trên tên miền của app):
// đổi code → id_token → lấy email → đối chiếu whitelist → cấp cookie phiên của app.
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const loi = (k: string) => {
    const r = NextResponse.redirect(new URL('/login?loi=' + k, origin))
    r.cookies.delete('g_state')
    return r
  }

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const stateCookie = request.cookies.get('g_state')?.value
  if (!code || !state || !stateCookie || state !== stateCookie) return loi('oauth')
  if (!CLIENT_ID || !CLIENT_SECRET) return loi('oauth')

  // Đổi code lấy token trực tiếp với Google.
  let email: string | undefined
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${origin}/auth/callback`,
      }),
    })
    if (!tokenRes.ok) return loi('oauth')
    const tok = (await tokenRes.json()) as { id_token?: string }
    if (!tok.id_token) return loi('oauth')
    const payload = docPayload(tok.id_token)
    if (!payload || payload.aud !== CLIENT_ID || payload.email_verified === false) return loi('oauth')
    email = payload.email?.toLowerCase()
  } catch {
    return loi('oauth')
  }
  if (!email) return loi('oauth')

  // Whitelist: chỉ email có trong danh sách + đang hoạt động mới vào được.
  const { data: nd } = await supabaseAdmin
    .from('vhjscvpp_nguoi_dung')
    .select('id, ho_ten, role, phong_ban_id, is_active')
    .ilike('email', email)
    .maybeSingle()
  if (!nd || nd.is_active === false) return loi('chua-cap-quyen')

  let phong_ban_ten: string | null = null
  if (nd.phong_ban_id) {
    const { data: pb } = await supabaseAdmin.from('vhjscvpp_phong_ban').select('ten').eq('id', nd.phong_ban_id).maybeSingle()
    phong_ban_ten = pb?.ten || null
  }

  const token = createSessionToken({
    id: nd.id,
    ho_ten: nd.ho_ten,
    role: nd.role as Role,
    phong_ban_id: nd.phong_ban_id,
    phong_ban_ten,
  })
  const response = NextResponse.redirect(new URL('/', origin))
  response.cookies.set('vpp_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  response.cookies.delete('g_state')
  return response
}
