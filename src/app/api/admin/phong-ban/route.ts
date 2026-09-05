import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Quản lý phòng ban — chỉ admin.
export async function POST(req: Request) {
  const session = await requireRole('admin')
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  const b = await req.json().catch(() => null)
  const ten = (b?.ten ?? '').toString().trim()
  if (!ten) return NextResponse.json({ error: 'Tên phòng ban không được để trống' }, { status: 400 })
  const { data, error } = await supabaseAdmin
    .from('vhjscvpp_phong_ban')
    .insert({ ten, ma: (b?.ma ?? '').toString().trim() || null })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: 'Tạo thất bại' }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}

export async function PATCH(req: Request) {
  const session = await requireRole('admin')
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  const b = await req.json().catch(() => null)
  if (!b?.id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })
  const ten = (b?.ten ?? '').toString().trim()
  if (!ten) return NextResponse.json({ error: 'Tên phòng ban không được để trống' }, { status: 400 })
  const { error } = await supabaseAdmin
    .from('vhjscvpp_phong_ban')
    .update({ ten, ma: (b?.ma ?? '').toString().trim() || null })
    .eq('id', b.id)
  if (error) return NextResponse.json({ error: 'Cập nhật thất bại' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const session = await requireRole('admin')
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  const b = await req.json().catch(() => null)
  if (!b?.id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })
  // FK on delete set null: user/phiếu thuộc phòng này sẽ được gỡ liên kết, không mất dữ liệu
  const { error } = await supabaseAdmin.from('vhjscvpp_phong_ban').delete().eq('id', b.id)
  if (error) return NextResponse.json({ error: 'Xoá thất bại' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
