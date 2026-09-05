import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import AppShell from '@/components/AppShell'
import { formatThang, thangHienTai } from '@/lib/format'

async function dem(table: string, filter?: (q: any) => any) {
  let q = supabaseAdmin.from(table).select('*', { count: 'exact', head: true })
  if (filter) q = filter(q)
  const { count } = await q
  return count || 0
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  // Tổng quan (toàn công ty) chỉ dành cho admin và HCNS; phòng ban vào thẳng phiếu của mình
  if (session.role !== 'admin' && session.role !== 'hcns') redirect('/phieu')

  const thang = thangHienTai()
  const [soSanPham, soPhieu, soPhieuThang] = await Promise.all([
    dem('vhjscvpp_san_pham', (q) => q.eq('dang_ban', true)),
    dem('vhjscvpp_phieu'),
    dem('vhjscvpp_phieu', (q) => q.eq('thang', thang)),
  ])

  const cards = [
    { label: 'Sản phẩm trong danh mục', value: soSanPham, href: '/dang-ky' },
    { label: `Phiếu tháng ${formatThang(thang)}`, value: soPhieuThang, href: '/phieu' },
    { label: 'Tổng số phiếu', value: soPhieu, href: '/phieu' },
  ]

  return (
    <AppShell user={session}>
      <h1 className="text-xl font-bold mb-1">Xin chào, {session.phong_ban_ten || session.ho_ten}</h1>
      <p className="text-sm text-muted mb-6">Lập phiếu đề xuất mua văn phòng phẩm theo mẫu BM01/QLTS/04-HCNS.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card p-5 hover:border-accent transition-colors">
            <div className="text-3xl font-bold text-accent-600">{c.value.toLocaleString('vi-VN')}</div>
            <div className="text-sm text-muted mt-1">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="flex gap-3">
        <Link href="/dang-ky" className="bg-accent hover:bg-accent-600 text-white rounded-lg px-5 py-2.5 font-medium">
          + Lập phiếu mới
        </Link>
        <Link href="/phieu" className="card px-5 py-2.5 font-medium hover:border-accent">
          Xem danh sách phiếu
        </Link>
      </div>
    </AppShell>
  )
}
