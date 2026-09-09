import { redirect } from 'next/navigation'
import Link from 'next/link'
import { layPhien, cap } from '@/lib/guard'
import NhapNcc from '@/components/NhapNcc'

export default async function NhapNccPage() {
  const session = await layPhien()
  if (!session) redirect('/login')
  if (!cap(session, 'ncc.quan_ly')) redirect('/')

  return (
    <>
      <Link href="/ncc" className="text-sm text-accent-600 hover:underline">← Nhà cung cấp</Link>
      <h1 className="text-xl font-bold mt-2 mb-1">Nhập nhà cung cấp từ Excel</h1>
      <p className="text-sm text-muted mb-5">
        Chọn file .xlsx (đọc ngay trên trình duyệt). Đọc được thẳng file <b>“Thống kê nhà cung cấp PHCNS”</b> của bạn
        (tự dò dòng tiêu đề, kể cả header gộp nhiều dòng) — không cần theo mẫu. Đối chiếu với NCC đã có theo MST,
        không có thì theo tên; NCC trùng chỉ được <b>bổ sung ô còn thiếu</b> (không ghi đè). “Tải file mẫu” chỉ để tham khảo cột.
      </p>
      <NhapNcc />
    </>
  )
}
