import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import AppShell from '@/components/AppShell'

// Layout dùng chung cho các trang cần đăng nhập: header (AppShell) nằm ở đây nên
// KHÔNG tải lại khi chuyển trang -> chuyển menu mượt như SPA.
export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')
  return <AppShell user={session}>{children}</AppShell>
}
