import { NextResponse } from 'next/server'
import { layPhien, cap } from '@/lib/guard'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashPassword } from '@/lib/password'

// Tạo người dùng. Quyền truy cập cấp riêng qua /quyen (nút "Quyền"); mặc định
// user mới được VPP · Người đề nghị để không bị "vô hình" trên hub.
export async function POST(req: Request) {
  const session = await layPhien()
  if (!session || !cap(session, 'quantri')) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  const b = await req.json().catch(() => null)
  const ho_ten = (b?.ho_ten ?? '').toString().trim()
  const username = (b?.username ?? '').toString().trim().toLowerCase()
  const password = (b?.password ?? '').toString()
  if (!ho_ten || !username || !password) return NextResponse.json({ error: 'Thiếu họ tên / tài khoản / mật khẩu' }, { status: 400 })

  const { data: existed } = await supabaseAdmin.from('vhjscvpp_nguoi_dung').select('id').eq('username', username).maybeSingle()
  if (existed) return NextResponse.json({ error: 'Tài khoản đã tồn tại' }, { status: 409 })

  const { data: ins, error } = await supabaseAdmin
    .from('vhjscvpp_nguoi_dung')
    .insert({
      ho_ten,
      username,
      password_hash: hashPassword(password),
      role: 'nguoi_de_nghi', // cột legacy, không còn dùng để chặn quyền
      phong_ban_id: b?.phong_ban_id || null,
      is_active: true,
    })
    .select('id')
    .single()
  if (error || !ins) return NextResponse.json({ error: 'Tạo thất bại' }, { status: 500 })
  await supabaseAdmin.from('vhjscvpp_quyen').upsert(
    { nguoi_dung_id: ins.id, module: 'vpp', vai_tro: 'nguoi_de_nghi' },
    { onConflict: 'nguoi_dung_id,module' },
  )
  return NextResponse.json({ ok: true })
}

// Sửa người dùng (họ tên, vai trò, phòng ban, trạng thái, đặt lại mật khẩu)
export async function PATCH(req: Request) {
  const session = await layPhien()
  if (!session || !cap(session, 'quantri')) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  const b = await req.json().catch(() => null)
  if (!b?.id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })

  const { data: cur } = await supabaseAdmin
    .from('vhjscvpp_nguoi_dung')
    .select('id, is_active, bao_ve')
    .eq('id', b.id)
    .maybeSingle()
  if (!cur) return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 })

  // Tài khoản gốc được bảo vệ: chỉ CHÍNH CHỦ mới sửa được (đổi mật khẩu/họ tên…)
  // và không được tự khoá (luôn còn 1 super-admin vào được Quản trị).
  if (cur.bao_ve) {
    if (session.id !== cur.id)
      return NextResponse.json({ error: 'Tài khoản quản trị gốc được bảo vệ — chỉ chính tài khoản này mới sửa được' }, { status: 403 })
    if (b.is_active === false)
      return NextResponse.json({ error: 'Không thể khoá tài khoản quản trị gốc' }, { status: 403 })
  }

  const upd: Record<string, unknown> = {}
  if (b.ho_ten != null) {
    const t = b.ho_ten.toString().trim()
    if (!t) return NextResponse.json({ error: 'Họ tên không được để trống' }, { status: 400 })
    upd.ho_ten = t
  }
  if (b.username != null) {
    const un = b.username.toString().trim().toLowerCase()
    if (!un) return NextResponse.json({ error: 'Tài khoản không được để trống' }, { status: 400 })
    const { data: taken } = await supabaseAdmin
      .from('vhjscvpp_nguoi_dung')
      .select('id')
      .eq('username', un)
      .neq('id', b.id)
      .maybeSingle()
    if (taken) return NextResponse.json({ error: 'Tài khoản đã tồn tại' }, { status: 409 })
    upd.username = un
  }
  if (b.phong_ban_id !== undefined) upd.phong_ban_id = b.phong_ban_id || null
  if (b.is_active != null) upd.is_active = !!b.is_active
  if (b.password) upd.password_hash = hashPassword(b.password.toString())

  const { error } = await supabaseAdmin.from('vhjscvpp_nguoi_dung').update(upd).eq('id', b.id)
  if (error) return NextResponse.json({ error: 'Cập nhật thất bại' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Xoá người dùng
export async function DELETE(req: Request) {
  const session = await layPhien()
  if (!session || !cap(session, 'quantri')) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  const b = await req.json().catch(() => null)
  if (!b?.id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })

  const { data: cur } = await supabaseAdmin.from('vhjscvpp_nguoi_dung').select('id, bao_ve').eq('id', b.id).maybeSingle()
  if (!cur) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 })
  if (cur.bao_ve) return NextResponse.json({ error: 'Tài khoản quản trị gốc được bảo vệ, không thể xoá' }, { status: 403 })

  // phiếu của người này: FK nguoi_de_nghi_id on delete set null (giữ lịch sử phiếu)
  const { error } = await supabaseAdmin.from('vhjscvpp_nguoi_dung').delete().eq('id', b.id)
  if (error) return NextResponse.json({ error: 'Xoá thất bại' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
