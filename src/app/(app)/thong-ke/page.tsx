import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { supabaseAdmin, selectAll } from '@/lib/supabase-admin'
import ThongKe from '@/components/ThongKe'

export default async function ThongKePage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin' && session.role !== 'hcns') redirect('/phieu')

  const phongBan = await selectAll<{ id: string; ten: string }>((from, to) =>
    supabaseAdmin.from('vhjscvpp_phong_ban').select('id, ten').order('ten').range(from, to),
  )

  return (
    <>
      <h1 className="text-xl font-bold mb-1">Thống kê</h1>
      <p className="text-sm text-muted mb-5">Tổng hợp trên phiếu đã duyệt, theo khoảng ngày lập và phòng ban.</p>
      <ThongKe phongBan={phongBan} />
    </>
  )
}
