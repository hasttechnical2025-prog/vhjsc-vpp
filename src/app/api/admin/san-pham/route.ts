import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { xoaCacheSanPham } from '@/lib/catalog'

export const runtime = 'nodejs'

// Sửa thông tin 1 mặt hàng (chỉ admin): tên, ĐVT, nhóm hàng, đơn giá, danh sách màu.
export async function PATCH(req: Request) {
  const session = await requireRole('admin')
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })

  const b = await req.json().catch(() => null)
  const id = Number(b?.id)
  if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })

  const upd: Record<string, unknown> = {}
  if (b.ten != null) {
    const t = String(b.ten).trim()
    if (!t) return NextResponse.json({ error: 'Tên hàng không được để trống' }, { status: 400 })
    upd.ten = t
  }
  if (b.dvt !== undefined) upd.dvt = String(b.dvt || '').trim() || null
  if (b.nhom_hang != null) {
    const n = String(b.nhom_hang).trim()
    if (!n) return NextResponse.json({ error: 'Nhóm hàng không được để trống' }, { status: 400 })
    upd.nhom_hang = n
  }
  if (b.don_gia !== undefined) {
    const g = b.don_gia === '' || b.don_gia == null ? null : Number(b.don_gia)
    if (g != null && (!Number.isFinite(g) || g < 0)) return NextResponse.json({ error: 'Đơn giá không hợp lệ' }, { status: 400 })
    upd.don_gia = g
  }
  if (b.bien_the !== undefined) {
    // Nhận mảng, hoặc chuỗi "Xanh, Đỏ" -> mảng; rỗng -> null
    let arr: string[] = []
    if (Array.isArray(b.bien_the)) arr = b.bien_the.map((x: unknown) => String(x).trim()).filter(Boolean)
    else if (typeof b.bien_the === 'string') arr = b.bien_the.split(/[,;]/).map((x: string) => x.trim()).filter(Boolean)
    upd.bien_the = arr.length ? arr : null
  }

  if (Object.keys(upd).length === 0) return NextResponse.json({ error: 'Không có gì để cập nhật' }, { status: 400 })

  const { error } = await supabaseAdmin.from('vhjscvpp_san_pham').update(upd).eq('id', id)
  if (error) return NextResponse.json({ error: 'Cập nhật thất bại' }, { status: 500 })

  xoaCacheSanPham()
  return NextResponse.json({ ok: true })
}
