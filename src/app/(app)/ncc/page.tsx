import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { supabaseAdmin, selectAll } from '@/lib/supabase-admin'
import type { NccRow } from '@/lib/types'
import NccList, { type DanhGiaMoiNhat } from '@/components/NccList'

export default async function NccPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin' && session.role !== 'hcns') redirect('/')

  const ncc = await selectAll<NccRow>((from, to) =>
    supabaseAdmin.from('vhjscvpp_ncc').select('*').order('ten').range(from, to),
  )
  const dg = await selectAll<{ ncc_id: string; ky: string; xep_loai: string | null; diem_tong: number | null; created_at: string }>(
    (from, to) =>
      supabaseAdmin
        .from('vhjscvpp_ncc_danh_gia')
        .select('ncc_id, ky, xep_loai, diem_tong, created_at')
        .order('created_at', { ascending: false })
        .range(from, to),
  )
  // Đánh giá mới nhất mỗi NCC
  const moiNhat: Record<string, DanhGiaMoiNhat> = {}
  for (const d of dg) if (!moiNhat[d.ncc_id]) moiNhat[d.ncc_id] = { ky: d.ky, xep_loai: d.xep_loai, diem_tong: d.diem_tong }

  const nhomList = Array.from(new Set(ncc.map((n) => n.nhom_chi_phi).filter((x): x is string => !!x))).sort((a, b) =>
    a.localeCompare(b, 'vi'),
  )

  return (
    <>
      <h1 className="text-xl font-bold mb-1">Nhà cung cấp</h1>
      <p className="text-sm text-muted mb-5">Hồ sơ NCC tập trung + đánh giá theo kỳ. Bấm một NCC để xem chi tiết, chấm điểm và đính kèm hợp đồng.</p>
      <NccList ncc={ncc} danhGia={moiNhat} nhomList={nhomList} />
    </>
  )
}
