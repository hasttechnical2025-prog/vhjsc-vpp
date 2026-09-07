import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { supabaseAdmin, selectAll } from '@/lib/supabase-admin'
import type { SanPham } from '@/lib/types'
import QuanLySanPham from '@/components/QuanLySanPham'

export default async function AdminSanPhamPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/')

  const sanPham = await selectAll<SanPham>((from, to) =>
    supabaseAdmin
      .from('vhjscvpp_san_pham')
      .select('id, nhom_hang, ten, xuat_xu, quy_cach, dvt, don_gia, anh_url, dang_ban, bien_the')
      .order('id', { ascending: true })
      .range(from, to),
  )
  const nhomList = Array.from(new Set(sanPham.map((s) => s.nhom_hang).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'vi'))

  return (
    <>
      <Link href="/vpp" className="text-sm text-accent-600 hover:underline">← Đăng ký VPP</Link>
      <h1 className="text-xl font-bold mt-2 mb-1">Sửa mặt hàng</h1>
      <p className="text-sm text-muted mb-5">
        Sửa tên, ĐVT, nhóm hàng, đơn giá, danh sách màu và thay ảnh cho từng mặt hàng. Dùng khi ảnh bị trượt dòng lúc import.
      </p>
      <QuanLySanPham sanPham={sanPham} nhomList={nhomList} />
    </>
  )
}
