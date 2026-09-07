import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Quản lý hồ sơ nhà cung cấp — chỉ admin & HCNS.
const TRUONG = [
  'ten', 'ma_so_thue', 'dia_chi', 'so_dien_thoai', 'email', 'nguoi_lien_he',
  'nhom_chi_phi', 'loai_chi_phi', 'co_hoa_don', 'tan_suat_thanh_toan',
  'ngay_den_han', 'hop_dong_mo_ta', 'hop_dong_het_han', 'trang_thai', 'ghi_chu',
] as const

function locTruong(b: Record<string, unknown>): Record<string, unknown> {
  const o: Record<string, unknown> = {}
  for (const k of TRUONG) {
    if (b[k] === undefined) continue
    if (k === 'hop_dong_het_han') o[k] = b[k] ? b[k] : null
    else o[k] = typeof b[k] === 'string' ? (String(b[k]).trim() || null) : b[k]
  }
  return o
}

export async function POST(req: Request) {
  const session = await requireRole('admin', 'hcns')
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  const b = await req.json().catch(() => null)
  const ten = String(b?.ten ?? '').trim()
  if (!ten) return NextResponse.json({ error: 'Nhập tên nhà cung cấp' }, { status: 400 })
  const rec = locTruong(b || {})
  rec.ten = ten
  if (!rec.trang_thai) rec.trang_thai = 'dang_dung'
  const { data, error } = await supabaseAdmin.from('vhjscvpp_ncc').insert(rec).select('id').single()
  if (error) return NextResponse.json({ error: 'Tạo NCC thất bại' }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}

export async function PATCH(req: Request) {
  const session = await requireRole('admin', 'hcns')
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  const b = await req.json().catch(() => null)
  if (!b?.id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })
  const rec = locTruong(b)
  if (b.ten !== undefined && !String(b.ten).trim())
    return NextResponse.json({ error: 'Tên không được để trống' }, { status: 400 })
  if (Object.keys(rec).length === 0) return NextResponse.json({ error: 'Không có gì để cập nhật' }, { status: 400 })
  rec.updated_at = new Date().toISOString()
  const { error } = await supabaseAdmin.from('vhjscvpp_ncc').update(rec).eq('id', b.id)
  if (error) return NextResponse.json({ error: 'Cập nhật thất bại' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const session = await requireRole('admin', 'hcns')
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  const b = await req.json().catch(() => null)
  if (!b?.id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })
  const { error } = await supabaseAdmin.from('vhjscvpp_ncc').delete().eq('id', b.id)
  if (error) return NextResponse.json({ error: 'Xoá thất bại' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
