import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import LapPhieu from '@/components/LapPhieu'
import { getSanPhamDangBan } from '@/lib/catalog'

export default async function DangKyPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // Danh mục có nhớ tạm (không tải lại 634 dòng mỗi lần vào); tên phòng lấy từ phiên
  const sanPham = await getSanPhamDangBan()

  return (
    <>
      <LapPhieu sanPham={sanPham} nguoiDeNghi={session.ho_ten} phongBanTen={session.phong_ban_ten || ''} />
    </>
  )
}
