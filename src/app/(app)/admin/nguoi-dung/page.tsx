import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { supabaseAdmin, selectAll } from '@/lib/supabase-admin'
import QuanLyToChuc from '@/components/QuanLyToChuc'
import type { PhongBanRow, NguoiDungRow } from '@/lib/types'

export default async function NguoiDungPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/')

  const phongBan = await selectAll<PhongBanRow>((from, to) =>
    supabaseAdmin.from('vhjscvpp_phong_ban').select('id, ten, ma, truong_bo_phan').order('ten').range(from, to),
  )
  const users = await selectAll<NguoiDungRow>((from, to) =>
    supabaseAdmin
      .from('vhjscvpp_nguoi_dung')
      .select('id, ho_ten, username, role, is_active, phong_ban_id')
      .order('created_at')
      .range(from, to),
  )

  return (
    <>
      <Link href="/admin" className="text-sm text-accent-600 hover:underline">← Quản trị</Link>
      <h1 className="text-xl font-bold mt-2 mb-1">Người dùng & Phòng ban</h1>
      <p className="text-sm text-muted mb-5">Tạo tài khoản đăng nhập cho từng phòng ban và quản lý phân quyền.</p>
      <QuanLyToChuc phongBan={phongBan} users={users} selfId={session.id} />
    </>
  )
}
