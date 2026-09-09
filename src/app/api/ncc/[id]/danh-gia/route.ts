import { NextResponse } from 'next/server'
import { layPhien, cap } from '@/lib/guard'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { tinhDiemTong, xepLoai, TIEU_CHI } from '@/lib/ncc'

// Thêm 1 bản đánh giá NCC theo kỳ — chỉ admin & HCNS.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await layPhien()
  if (!session || !cap(session, 'ncc.vao')) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  const { id } = await params
  const b = await req.json().catch(() => null)
  const ky = String(b?.ky ?? '').trim()
  if (!ky) return NextResponse.json({ error: 'Nhập kỳ đánh giá (VD: Năm 2026)' }, { status: 400 })

  const diem: Record<string, number> = {}
  for (const t of TIEU_CHI) {
    const v = Math.round(Number(b?.[t.key]))
    if (!v || v < 1 || v > 5) return NextResponse.json({ error: `Điểm "${t.nhan}" phải từ 1–5` }, { status: 400 })
    diem[t.key] = v
  }
  const diem_tong = tinhDiemTong(diem)
  const xl = xepLoai(diem_tong)

  const { error } = await supabaseAdmin.from('vhjscvpp_ncc_danh_gia').insert({
    ncc_id: id,
    ky,
    ...diem,
    diem_tong,
    xep_loai: xl,
    nhan_xet: String(b?.nhan_xet ?? '').trim() || null,
    de_xuat: b?.de_xuat || null,
    nguoi_cham_ten: session.ho_ten,
  })
  if (error) return NextResponse.json({ error: 'Lưu đánh giá thất bại' }, { status: 500 })
  return NextResponse.json({ ok: true, diem_tong, xep_loai: xl })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await layPhien()
  if (!session || !cap(session, 'ncc.quan_ly')) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  await params
  const b = await req.json().catch(() => null)
  if (!b?.danh_gia_id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })
  const { error } = await supabaseAdmin.from('vhjscvpp_ncc_danh_gia').delete().eq('id', b.danh_gia_id)
  if (error) return NextResponse.json({ error: 'Xoá thất bại' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
