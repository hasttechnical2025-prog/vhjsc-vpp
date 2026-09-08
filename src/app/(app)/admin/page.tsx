import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

// Quản trị hệ thống không còn trang "Tổng quan" — vào thẳng Người dùng & Phòng ban.
export default async function AdminPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/')
  redirect('/admin/nguoi-dung')
}
