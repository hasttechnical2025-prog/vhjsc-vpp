import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashPassword } from '@/lib/password'

const ROLES = ['admin', 'hcns', 'nguoi_de_nghi']

async function soAdminConHoatDong(excludeId?: string): Promise<number> {
  let q = supabaseAdmin
    .from('vhjscvpp_nguoi_dung')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin')
    .eq('is_active', true)
  if (excludeId) q = q.neq('id', excludeId)
  const { count } = await q
  return count || 0
}

// Tạo người dùng
export async function POST(req: Request) {
  const session = await requireRole('admin')
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  const b = await req.json().catch(() => null)
  const ho_ten = (b?.ho_ten ?? '').toString().trim()
  const username = (b?.username ?? '').toString().trim().toLowerCase()
  const password = (b?.password ?? '').toString()
  const role = (b?.role ?? 'nguoi_de_nghi').toString()
  if (!ho_ten || !username || !password) return NextResponse.json({ error: 'Thiếu họ tên / tài khoản / mật khẩu' }, { status: 400 })
  if (!ROLES.includes(role)) return NextResponse.json({ error: 'Vai trò không hợp lệ' }, { status: 400 })

  const { data: existed } = await supabaseAdmin.from('vhjscvpp_nguoi_dung').select('id').eq('username', username).maybeSingle()
  if (existed) return NextResponse.json({ error: 'Tài khoản đã tồn tại' }, { status: 409 })

  const { error } = await supabaseAdmin.from('vhjscvpp_nguoi_dung').insert({
    ho_ten,
    username,
    password_hash: hashPassword(password),
    role,
    phong_ban_id: b?.phong_ban_id || null,
    is_active: true,
  })
  if (error) return NextResponse.json({ error: 'Tạo thất bại' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Sửa người dùng (họ tên, vai trò, phòng ban, trạng thái, đặt lại mật khẩu)
export async function PATCH(req: Request) {
  const session = await requireRole('admin')
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  const b = await req.json().catch(() => null)
  if (!b?.id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })

  const { data: cur } = await supabaseAdmin
    .from('vhjscvpp_nguoi_dung')
    .select('id, role, is_active')
    .eq('id', b.id)
    .maybeSingle()
  if (!cur) return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 })

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
  if (b.role != null) {
    if (!ROLES.includes(b.role)) return NextResponse.json({ error: 'Vai trò không hợp lệ' }, { status: 400 })
    upd.role = b.role
  }
  if (b.phong_ban_id !== undefined) upd.phong_ban_id = b.phong_ban_id || null
  if (b.is_active != null) upd.is_active = !!b.is_active
  if (b.password) upd.password_hash = hashPassword(b.password.toString())

  // Chốt duy nhất: luôn phải còn ít nhất 1 admin đang hoạt động
  // (cho phép tự khoá/hạ quyền nếu vẫn còn admin khác)
  const boAdmin = (upd.role != null && upd.role !== 'admin' && cur.role === 'admin') || (upd.is_active === false && cur.role === 'admin')
  if (boAdmin && (await soAdminConHoatDong(cur.id)) === 0)
    return NextResponse.json({ error: 'Phải còn ít nhất 1 admin đang hoạt động' }, { status: 400 })

  const { error } = await supabaseAdmin.from('vhjscvpp_nguoi_dung').update(upd).eq('id', b.id)
  if (error) return NextResponse.json({ error: 'Cập nhật thất bại' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Xoá người dùng
export async function DELETE(req: Request) {
  const session = await requireRole('admin')
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  const b = await req.json().catch(() => null)
  if (!b?.id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })

  const { data: cur } = await supabaseAdmin.from('vhjscvpp_nguoi_dung').select('id, role').eq('id', b.id).maybeSingle()
  if (!cur) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 })
  if (cur.role === 'admin' && (await soAdminConHoatDong(cur.id)) === 0)
    return NextResponse.json({ error: 'Phải còn ít nhất 1 admin đang hoạt động' }, { status: 400 })

  // phiếu của người này: FK nguoi_de_nghi_id on delete set null (giữ lịch sử phiếu)
  const { error } = await supabaseAdmin.from('vhjscvpp_nguoi_dung').delete().eq('id', b.id)
  if (error) return NextResponse.json({ error: 'Xoá thất bại' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
