import Link from 'next/link'
import LogoutButton from './LogoutButton'
import NavLinks from './NavLinks'
import { getCauHinh } from '@/lib/config'
import type { Role } from '@/lib/session'

const NAV: { href: string; label: string; roles?: Role[] }[] = [
  { href: '/', label: 'Tổng quan', roles: ['admin', 'hcns'] },
  { href: '/dang-ky', label: 'Lập phiếu' },
  { href: '/phieu', label: 'Danh sách phiếu' },
  { href: '/admin', label: 'Quản trị', roles: ['admin', 'hcns'] },
]

export default async function AppShell({
  user,
  children,
}: {
  user: { ho_ten: string; role: Role; phong_ban_ten?: string | null }
  children: React.ReactNode
}) {
  const cauHinh = await getCauHinh()
  const items = NAV.filter((n) => !n.roles || n.roles.includes(user.role))
  const tenHienThi = user.phong_ban_ten || user.ho_ten
  // Phòng ban vào thẳng danh sách phiếu; admin/hcns có Tổng quan ở '/'
  const brandHref = user.role === 'admin' || user.role === 'hcns' ? '/' : '/phieu'

  return (
    <div className="min-h-screen">
      <header className="bg-surface border-b border-border sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
          <Link href={brandHref} className="flex items-center gap-2 text-lg font-bold tracking-tight text-accent-600 shrink-0">
            {cauHinh.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cauHinh.logo_url} alt="Logo" className="h-9 w-auto object-contain" />
            ) : null}
            <span>{cauHinh.brand_text}</span>
          </Link>
          <NavLinks items={items.map((n) => ({ href: n.href, label: n.label }))} />
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-muted hidden sm:inline">{tenHienThi}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
