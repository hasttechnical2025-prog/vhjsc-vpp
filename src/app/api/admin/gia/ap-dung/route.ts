import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Áp dụng thay đổi giá admin đã duyệt: cập nhật giá theo mã hàng (id),
// thêm sản phẩm mới (cấp id mới nối tiếp), ẩn sản phẩm không còn.

type CapNhat = { id: number; gia_moi: number }
type ThemMoi = {
  nhom_hang: string
  ten: string
  xuat_xu?: string | null
  quy_cach?: string | null
  dvt?: string | null
  don_gia: number | null
}

export async function POST(req: Request) {
  const session = await requireRole('admin', 'hcns')
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const capNhat: CapNhat[] = Array.isArray(body?.capNhatGia) ? body.capNhatGia : []
  const themMoi: ThemMoi[] = Array.isArray(body?.themMoi) ? body.themMoi : []
  const anSp: number[] = Array.isArray(body?.anSp) ? body.anSp : []

  let soCapNhat = 0
  let soThem = 0
  let soAn = 0

  // 1) Cập nhật giá theo id
  for (const c of capNhat) {
    if (typeof c.id !== 'number' || c.gia_moi == null) continue
    const { error } = await supabaseAdmin
      .from('vhjscvpp_san_pham')
      .update({ don_gia: c.gia_moi })
      .eq('id', c.id)
    if (!error) soCapNhat++
  }

  // 2) Thêm sản phẩm mới với id nối tiếp
  if (themMoi.length > 0) {
    const { data: maxRow } = await supabaseAdmin
      .from('vhjscvpp_san_pham')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()
    let nextId = (maxRow?.id || 0) + 1
    const rows = themMoi.map((t) => ({
      id: nextId++,
      nhom_hang: t.nhom_hang,
      ten: t.ten,
      xuat_xu: t.xuat_xu || null,
      quy_cach: t.quy_cach || null,
      dvt: t.dvt || null,
      don_gia: t.don_gia,
      anh_url: null,
      dang_ban: true,
    }))
    const { error } = await supabaseAdmin.from('vhjscvpp_san_pham').insert(rows)
    if (!error) soThem = rows.length
  }

  // 3) Ẩn sản phẩm không còn
  if (anSp.length > 0) {
    const { error } = await supabaseAdmin
      .from('vhjscvpp_san_pham')
      .update({ dang_ban: false })
      .in('id', anSp)
    if (!error) soAn = anSp.length
  }

  return NextResponse.json({ ok: true, soCapNhat, soThem, soAn })
}
