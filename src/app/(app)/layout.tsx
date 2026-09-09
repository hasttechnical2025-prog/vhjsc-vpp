import { redirect } from 'next/navigation'
import { layPhien } from '@/lib/guard'
import AppShell from '@/components/AppShell'

// Layout dùng chung cho các trang cần đăng nhập: header (AppShell) nằm ở đây nên
// KHÔNG tải lại khi chuyển trang -> chuyển menu mượt như SPA.
export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const phien = await layPhien()
  if (!phien) redirect('/login')
  return <AppShell phien={phien}>{children}</AppShell>
}
