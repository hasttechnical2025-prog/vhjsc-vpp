import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { getCauHinh } from '@/lib/config'
import CauHinhForm from '@/components/CauHinhForm'

export default async function CauHinhPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/')

  const cauHinh = await getCauHinh()

  return (
    <>
      <Link href="/admin" className="text-sm text-accent-600 hover:underline">← Quản trị</Link>
      <h1 className="text-xl font-bold mt-2 mb-1">Cấu hình hiển thị</h1>
      <p className="text-sm text-muted mb-5">Đổi logo và dòng chữ thương hiệu trên thanh tiêu đề.</p>
      <CauHinhForm brandText={cauHinh.brand_text} logoUrl={cauHinh.logo_url} />
    </>
  )
}
