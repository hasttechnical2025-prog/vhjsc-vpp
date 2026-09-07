import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { formatThang, thangHienTai } from '@/lib/format'

// Tổng quan module Đăng ký VPP (toàn công ty) — admin & HCNS.
async function dem(table: string, filter?: (q: any) => any) {
  let q = supabaseAdmin.from(table).select('*', { count: 'exact', head: true })
  if (filter) q = filter(q)
  const { count } = await q
  return count || 0
}

export default async function TongQuanVppPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin' && session.role !== 'hcns') redirect('/vpp/phieu')

  const thang = thangHienTai()
  const [soSanPham, soPhieuThang, soChoDuyet] = await Promise.all([
    dem('vhjscvpp_san_pham', (q) => q.eq('dang_ban', true)),
    dem('vhjscvpp_phieu', (q) => q.eq('thang', thang)),
    dem('vhjscvpp_phieu', (q) => q.eq('trang_thai', 'cho_duyet')),
  ])

  const cards = [
    { label: 'Phiếu chờ duyệt', value: soChoDuyet, href: '/vpp/phieu', nhan: true },
    { label: `Phiếu tháng ${formatThang(thang)}`, value: soPhieuThang, href: '/vpp/phieu' },
    { label: 'Sản phẩm trong danh mục', value: soSanPham, href: '/vpp/dang-ky' },
  ]

  return (
    <>
      <h1 className="text-xl font-bold mb-1">Đăng ký VPP — Tổng quan</h1>
      <p className="text-sm text-muted mb-6">Đề xuất mua văn phòng phẩm theo mẫu BM01/QLTS/04-HCNS.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card p-5 hover:border-accent transition-colors">
            <div className={`text-3xl font-bold ${c.nhan && c.value > 0 ? 'text-warn' : 'text-accent-600'}`}>
              {c.value.toLocaleString('vi-VN')}
            </div>
            <div className="text-sm text-muted mt-1">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="flex gap-3">
        <Link href="/vpp/dang-ky" className="bg-accent hover:bg-accent-600 text-white rounded-lg px-5 py-2.5 font-medium">
          + Lập phiếu mới
        </Link>
        <Link href="/vpp/phieu" className="card px-5 py-2.5 font-medium hover:border-accent">
          Xem danh sách phiếu
        </Link>
      </div>
    </>
  )
}
