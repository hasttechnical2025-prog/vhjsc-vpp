import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { supabaseAdmin, selectAll } from '@/lib/supabase-admin'
import AppShell from '@/components/AppShell'
import PhieuList from '@/components/PhieuList'

type Row = {
  id: string
  phong_ban_id: string | null
  phong_ban_ten: string
  nguoi_de_nghi_ten: string
  thang: string
  tong_tien: number
  created_at: string
}

export default async function PhieuListPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const canAll = session.role === 'admin' || session.role === 'hcns'
  const phieu = await selectAll<Row>((from, to) => {
    let q = supabaseAdmin
      .from('vhjscvpp_phieu')
      .select('id, phong_ban_id, phong_ban_ten, nguoi_de_nghi_ten, thang, tong_tien, created_at')
      .order('created_at', { ascending: false })
      .range(from, to)
    if (!canAll) q = q.eq('nguoi_de_nghi_id', session.id)
    return q
  })

  let phongBan: { id: string; ten: string }[] = []
  if (canAll) {
    phongBan = await selectAll<{ id: string; ten: string }>((from, to) =>
      supabaseAdmin.from('vhjscvpp_phong_ban').select('id, ten').order('ten').range(from, to),
    )
  }

  return (
    <AppShell user={session}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Danh sách phiếu</h1>
        <Link href="/dang-ky" className="bg-accent hover:bg-accent-600 text-white rounded-lg px-4 py-2 text-sm font-medium">
          + Lập phiếu mới
        </Link>
      </div>
      <PhieuList phieu={phieu} phongBan={phongBan} canAll={canAll} />
    </AppShell>
  )
}
