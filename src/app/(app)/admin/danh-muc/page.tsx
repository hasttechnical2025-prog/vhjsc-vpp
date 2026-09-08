import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { getNccNhom } from '@/lib/ncc-nhom'
import QuanLyDanhMuc from '@/components/QuanLyDanhMuc'

export default async function DanhMucPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/')

  const nccNhom = await getNccNhom()

  return (
    <>
      <Link href="/admin" className="text-sm text-accent-600 hover:underline">← Quản trị</Link>
      <h1 className="text-xl font-bold mt-2 mb-1">Danh mục</h1>
      <p className="text-sm text-muted mb-5">Các danh mục dropdown dùng chung (nhóm chi phí NCC… — sẽ bổ sung danh mục cho các module khác tại đây).</p>
      <QuanLyDanhMuc nccNhom={nccNhom} />
    </>
  )
}
