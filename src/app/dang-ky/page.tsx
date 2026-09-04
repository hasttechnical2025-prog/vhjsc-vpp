import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { supabaseAdmin, selectAll } from '@/lib/supabase-admin'
import AppShell from '@/components/AppShell'
import LapPhieu from '@/components/LapPhieu'
import type { SanPham } from '@/lib/types'

export default async function DangKyPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const sanPham = await selectAll<SanPham>((from, to) =>
    supabaseAdmin
      .from('vpp_san_pham')
      .select('id, nhom_hang, ten, xuat_xu, quy_cach, dvt, don_gia, anh_url, dang_ban')
      .eq('dang_ban', true)
      .order('id', { ascending: true })
      .range(from, to),
  )

  // Tên phòng ban của người dùng (để điền sẵn phiếu)
  let phongBanTen = ''
  if (session.phong_ban_id) {
    const { data } = await supabaseAdmin
      .from('vpp_phong_ban')
      .select('ten')
      .eq('id', session.phong_ban_id)
      .maybeSingle()
    phongBanTen = data?.ten || ''
  }

  return (
    <AppShell user={session}>
      <LapPhieu sanPham={sanPham} nguoiDeNghi={session.ho_ten} phongBanTen={phongBanTen} />
    </AppShell>
  )
}
