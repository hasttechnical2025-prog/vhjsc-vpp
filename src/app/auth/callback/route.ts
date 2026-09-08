import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createSessionToken, type Role } from '@/lib/session'

export const runtime = 'nodejs'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Callback sau khi đăng nhập Google: đổi code → lấy email → đối chiếu whitelist
// (user đã import, đang hoạt động) → cấp cookie phiên của app (như luồng cũ).
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const code = request.nextUrl.searchParams.get('code')
  const loi = (k: string) => NextResponse.redirect(new URL('/login?loi=' + k, origin))
  if (!code) return loi('oauth')

  const response = NextResponse.redirect(new URL('/', origin))
  const supabase = createServerClient(SB_URL, SB_ANON, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => list.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  })

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  const email = data?.user?.email?.toLowerCase()
  if (error || !email) return loi('oauth')

  // Whitelist: chỉ email có trong danh sách + đang hoạt động mới vào được.
  const { data: nd } = await supabaseAdmin
    .from('vhjscvpp_nguoi_dung')
    .select('id, ho_ten, role, phong_ban_id, is_active')
    .ilike('email', email)
    .maybeSingle()
  if (!nd || nd.is_active === false) {
    await supabase.auth.signOut() // không giữ phiên Supabase cho email không được phép
    return loi('chua-cap-quyen')
  }

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
  response.cookies.set('vpp_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return response
}
