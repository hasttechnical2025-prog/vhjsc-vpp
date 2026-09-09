import { NextResponse } from 'next/server'
import { layPhien, cap } from '@/lib/guard'
import { supabaseAdmin, selectAll } from '@/lib/supabase-admin'
import { traCuuMst, phanLoaiMst } from '@/lib/mst'

export const runtime = 'nodejs'
export const maxDuration = 60

const nghi = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Kiểm tra tình trạng MST cho MỌI NCC đang dùng có MST (tuần tự, có nghỉ nhẹ).
export async function POST() {
  const session = await layPhien()
  if (!session || !cap(session, 'ncc.vao')) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })

  const list = await selectAll<{ id: string; ma_so_thue: string | null }>((from, to) =>
    supabaseAdmin.from('vhjscvpp_ncc').select('id, ma_so_thue').not('ma_so_thue', 'is', null).range(from, to),
  )
  let hoat_dong = 0, ngung = 0, tam_nghi = 0, khac = 0, loi = 0
  for (const n of list) {
    const kq = await traCuuMst(n.ma_so_thue)
    const trang_thai = kq.ok ? kq.trang_thai! : kq.loi || 'Không tra được'
    await supabaseAdmin
      .from('vhjscvpp_ncc')
      .update({ mst_trang_thai: trang_thai, mst_kiem_tra_luc: new Date().toISOString() })
      .eq('id', n.id)
    if (!kq.ok) loi++
    else {
      const l = phanLoaiMst(trang_thai)
      if (l === 'hoat_dong') hoat_dong++
      else if (l === 'ngung') ngung++
      else if (l === 'tam_nghi') tam_nghi++
      else khac++
    }
    await nghi(200)
  }
  return NextResponse.json({ ok: true, da_kiem: list.length, hoat_dong, ngung, tam_nghi, khac, loi })
}
