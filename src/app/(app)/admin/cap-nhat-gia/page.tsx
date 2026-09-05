import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import CapNhatGia from '@/components/CapNhatGia'

export default async function CapNhatGiaPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin' && session.role !== 'hcns') redirect('/')

  return (
    <>
      <Link href="/admin" className="text-sm text-accent-600 hover:underline">← Quản trị</Link>
      <h1 className="text-xl font-bold mt-2 mb-1">Cập nhật giá từ báo giá NCC</h1>
      <p className="text-sm text-muted mb-5">
        Chọn file báo giá (.xlsx) tháng mới. File được đọc ngay trên trình duyệt, chỉ dữ liệu giá được gửi lên —
        không tải file nặng lên máy chủ. Đối chiếu theo tên trong cùng nhóm hàng; cập nhật giá theo mã hàng.
      </p>
      <CapNhatGia />
    </>
  )
}
