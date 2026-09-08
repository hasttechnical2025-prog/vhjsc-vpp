import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import NhapNcc from '@/components/NhapNcc'

export default async function NhapNccPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin' && session.role !== 'hcns') redirect('/')

  return (
    <>
      <Link href="/ncc" className="text-sm text-accent-600 hover:underline">← Nhà cung cấp</Link>
      <h1 className="text-xl font-bold mt-2 mb-1">Nhập nhà cung cấp từ Excel</h1>
      <p className="text-sm text-muted mb-5">
        Chọn file .xlsx (đọc ngay trên trình duyệt). Đối chiếu với NCC đã có theo MST, không có thì theo tên.
        NCC trùng chỉ được <b>bổ sung ô còn thiếu</b> — không ghi đè dữ liệu đã có. Bấm “Tải file mẫu” để xem đúng cột.
      </p>
      <NhapNcc />
    </>
  )
}
