import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { supabaseAdmin, selectAll } from '@/lib/supabase-admin'
import AppShell from '@/components/AppShell'
import { formatThang, formatTien, formatDate } from '@/lib/format'
import type { Phieu } from '@/lib/types'

type PhieuLite = Pick<
  Phieu,
  'id' | 'phong_ban_ten' | 'nguoi_de_nghi_ten' | 'thang' | 'trang_thai' | 'tong_tien' | 'created_at'
>

export default async function PhieuListPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const canAll = session.role === 'admin' || session.role === 'hcns'
  const phieu = await selectAll<PhieuLite>((from, to) => {
    let q = supabaseAdmin
      .from('vpp_phieu')
      .select('id, phong_ban_ten, nguoi_de_nghi_ten, thang, trang_thai, tong_tien, created_at')
      .order('created_at', { ascending: false })
      .range(from, to)
    if (!canAll) q = q.eq('nguoi_de_nghi_id', session.id)
    return q
  })

  return (
    <AppShell user={session}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Danh sách phiếu</h1>
        <Link href="/dang-ky" className="bg-accent hover:bg-accent-600 text-white rounded-lg px-4 py-2 text-sm font-medium">
          + Lập phiếu mới
        </Link>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-accent-50 text-accent-600">
            <tr className="text-left">
              <th className="px-3 py-2 font-semibold">Tháng</th>
              <th className="px-3 py-2 font-semibold">Phòng ban</th>
              <th className="px-3 py-2 font-semibold">Người đề nghị</th>
              <th className="px-3 py-2 font-semibold">Ngày lập</th>
              <th className="px-3 py-2 font-semibold text-right">Tạm tính</th>
              <th className="px-3 py-2 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {phieu.map((p) => (
              <tr key={p.id} className="border-t border-border hover:bg-accent-50/40">
                <td className="px-3 py-2">{formatThang(p.thang)}</td>
                <td className="px-3 py-2">{p.phong_ban_ten || '—'}</td>
                <td className="px-3 py-2">{p.nguoi_de_nghi_ten}</td>
                <td className="px-3 py-2">{formatDate(p.created_at)}</td>
                <td className="px-3 py-2 text-right">{formatTien(p.tong_tien)}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <Link href={`/phieu/${p.id}`} className="text-accent-600 hover:underline">
                    Xem
                  </Link>
                  <a
                    href={`/api/phieu/${p.id}/pdf`}
                    className="text-accent-600 hover:underline ml-3"
                    target="_blank"
                    rel="noreferrer"
                  >
                    PDF
                  </a>
                </td>
              </tr>
            ))}
            {phieu.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted">
                  Chưa có phiếu nào. <Link href="/dang-ky" className="text-accent-600">Lập phiếu đầu tiên</Link>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  )
}
