import { NextResponse } from 'next/server'
import { layPhien, cap } from '@/lib/guard'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { xoaCacheSanPham } from '@/lib/catalog'

export const runtime = 'nodejs'

// Đổi tên 1 nhóm hàng (category) cho TẤT CẢ sản phẩm trong nhóm. Chỉ admin.
export async function PATCH(req: Request) {
  const session = await layPhien()
  if (!session || !cap(session, 'vpp.quan_ly')) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })

  const b = await req.json().catch(() => null)
  const cu = String(b?.cu ?? '').trim()
  const moi = String(b?.moi ?? '').trim()
  if (!cu || !moi) return NextResponse.json({ error: 'Thiếu tên nhóm' }, { status: 400 })
  if (cu === moi) return NextResponse.json({ error: 'Tên mới trùng tên cũ' }, { status: 400 })

  const { error, count } = await supabaseAdmin
    .from('vhjscvpp_san_pham')
    .update({ nhom_hang: moi }, { count: 'exact' })
    .eq('nhom_hang', cu)
  if (error) return NextResponse.json({ error: 'Đổi tên thất bại' }, { status: 500 })

  xoaCacheSanPham()
  return NextResponse.json({ ok: true, count: count || 0 })
}
