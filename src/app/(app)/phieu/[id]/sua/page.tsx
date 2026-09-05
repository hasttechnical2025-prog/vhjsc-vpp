import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import LapPhieu, { type PhieuBanDau } from '@/components/LapPhieu'
import { getSanPhamDangBan } from '@/lib/catalog'

type DongDb = {
  san_pham_id: number | null
  ten_hang: string | null
  ten_tay: string | null
  dvt: string | null
  don_gia: number | null
  so_luong: number
  ghi_chu: string | null
}

export default async function SuaPhieuPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { id } = await params

  const { data: phieu } = await supabaseAdmin.from('vhjscvpp_phieu').select('*').eq('id', id).maybeSingle()
  if (!phieu) notFound()
  const allowed =
    session.role === 'admin' || session.role === 'hcns' || phieu.nguoi_de_nghi_id === session.id
  if (!allowed) redirect('/phieu')

  const { data: dong } = await supabaseAdmin
    .from('vhjscvpp_phieu_dong')
    .select('san_pham_id, ten_hang, ten_tay, dvt, don_gia, so_luong, ghi_chu, thu_tu')
    .eq('phieu_id', id)
    .order('thu_tu', { ascending: true })

  const sanPham = await getSanPhamDangBan()

  const initial: PhieuBanDau = {
    thang: phieu.thang,
    tieu_de: phieu.tieu_de,
    thoi_gian_can: phieu.thoi_gian_can,
    ke_hoach_su_dung: phieu.ke_hoach_su_dung,
    dong: ((dong || []) as DongDb[]).map((d) => ({
      san_pham_id: d.san_pham_id,
      ten_hang: d.ten_hang,
      ten_tay: d.ten_tay,
      dvt: d.dvt,
      don_gia: d.don_gia == null ? null : Number(d.don_gia),
      so_luong: Number(d.so_luong),
      ghi_chu: d.ghi_chu,
    })),
  }

  return (
    <>
      <LapPhieu
        sanPham={sanPham}
        nguoiDeNghi={session.ho_ten}
        phongBanTen={session.phong_ban_ten || ''}
        phieuId={id}
        initial={initial}
      />
    </>
  )
}
