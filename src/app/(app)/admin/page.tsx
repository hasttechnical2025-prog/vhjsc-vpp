import { redirect } from 'next/navigation'
import { layPhien, cap } from '@/lib/guard'

// Quản trị hệ thống không còn trang "Tổng quan" — vào thẳng Người dùng & Phòng ban.
export default async function AdminPage() {
  const session = await layPhien()
  if (!session) redirect('/login')
  if (!cap(session, 'quantri')) redirect('/')
  redirect('/admin/nguoi-dung')
}
