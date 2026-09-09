import { NextResponse } from 'next/server'
import { layPhien, cap } from '@/lib/guard'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { traCuuMst } from '@/lib/mst'

export const runtime = 'nodejs'

// Tra cứu tình trạng MST của 1 NCC, lưu kết quả + thời điểm. Trả kèm tên/địa chỉ
// chuẩn để giao diện đề nghị điền (không tự ghi đè).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await layPhien()
  if (!session || !cap(session, 'ncc.vao')) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  const { id } = await params

  const { data: ncc } = await supabaseAdmin.from('vhjscvpp_ncc').select('id, ma_so_thue').eq('id', id).maybeSingle()
  if (!ncc) return NextResponse.json({ error: 'Không tìm thấy NCC' }, { status: 404 })
  if (!ncc.ma_so_thue) return NextResponse.json({ error: 'NCC chưa có MST — hãy điền MST trước' }, { status: 400 })

  const kq = await traCuuMst(ncc.ma_so_thue)
  const trang_thai = kq.ok ? kq.trang_thai! : kq.loi || 'Không tra được'
  await supabaseAdmin
    .from('vhjscvpp_ncc')
    .update({ mst_trang_thai: trang_thai, mst_kiem_tra_luc: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({ ok: kq.ok, trang_thai, ten: kq.ten || null, dia_chi: kq.dia_chi || null })
}
