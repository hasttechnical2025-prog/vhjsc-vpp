import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Quản lý danh mục Nhóm chi phí NCC (chỉ admin). Có thứ tự để sắp xếp danh sách NCC.
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const session = await requireRole('admin')
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  const b = await req.json().catch(() => null)
  const ten = String(b?.ten ?? '').trim()
  if (!ten) return NextResponse.json({ error: 'Nhập tên nhóm chi phí' }, { status: 400 })
  const { data: max } = await supabaseAdmin.from('vhjscvpp_ncc_nhom').select('thu_tu').order('thu_tu', { ascending: false }).limit(1).maybeSingle()
  const { error } = await supabaseAdmin.from('vhjscvpp_ncc_nhom').insert({ ten, thu_tu: (max?.thu_tu ?? 0) + 1 })
  if (error) return NextResponse.json({ error: /duplicate/i.test(error.message) ? 'Nhóm đã tồn tại' : 'Thêm thất bại' }, { status: 400 })
  return NextResponse.json({ ok: true })
}

// Đổi tên 1 nhóm (kèm cập nhật các NCC đang dùng tên cũ) HOẶC sắp xếp lại (ids[]).
export async function PATCH(req: Request) {
  const session = await requireRole('admin')
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  const b = await req.json().catch(() => null)

  if (Array.isArray(b?.ids)) {
    // Sắp xếp lại: thu_tu = vị trí trong mảng
    for (let i = 0; i < b.ids.length; i++) {
      await supabaseAdmin.from('vhjscvpp_ncc_nhom').update({ thu_tu: i + 1 }).eq('id', b.ids[i])
    }
    return NextResponse.json({ ok: true })
  }

  const id = String(b?.id ?? '')
  const tenMoi = String(b?.ten ?? '').trim()
  if (!id || !tenMoi) return NextResponse.json({ error: 'Thiếu dữ liệu' }, { status: 400 })
  const { data: cur } = await supabaseAdmin.from('vhjscvpp_ncc_nhom').select('ten').eq('id', id).maybeSingle()
  if (!cur) return NextResponse.json({ error: 'Không tìm thấy nhóm' }, { status: 404 })
  const { error } = await supabaseAdmin.from('vhjscvpp_ncc_nhom').update({ ten: tenMoi }).eq('id', id)
  if (error) return NextResponse.json({ error: /duplicate/i.test(error.message) ? 'Nhóm đã tồn tại' : 'Đổi tên thất bại' }, { status: 400 })
  // Cập nhật các NCC đang mang tên nhóm cũ
  if (cur.ten !== tenMoi) await supabaseAdmin.from('vhjscvpp_ncc').update({ nhom_chi_phi: tenMoi }).eq('nhom_chi_phi', cur.ten)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const session = await requireRole('admin')
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  const b = await req.json().catch(() => null)
  const id = String(b?.id ?? '')
  if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })
  const { error } = await supabaseAdmin.from('vhjscvpp_ncc_nhom').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Xoá thất bại' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
