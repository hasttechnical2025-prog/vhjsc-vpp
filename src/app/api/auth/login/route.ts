import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyPassword } from '@/lib/password'
import { setSessionCookie, type Role } from '@/lib/session'

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}))
  if (!username || !password) {
    return NextResponse.json({ error: 'Thiếu tài khoản hoặc mật khẩu' }, { status: 400 })
  }

  const { data: user } = await supabaseAdmin
    .from('vpp_nguoi_dung')
    .select('id, ho_ten, role, phong_ban_id, password_hash, is_active')
    .eq('username', String(username).trim().toLowerCase())
    .maybeSingle()

  if (!user || user.is_active === false || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: 'Sai tài khoản hoặc mật khẩu' }, { status: 401 })
  }

  await setSessionCookie({
    id: user.id,
    ho_ten: user.ho_ten,
    role: user.role as Role,
    phong_ban_id: user.phong_ban_id,
  })
  return NextResponse.json({ ok: true, role: user.role })
}
