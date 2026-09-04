import Link from 'next/link'
import LogoutButton from './LogoutButton'
import type { Role } from '@/lib/session'

const NAV: { href: string; label: string; roles?: Role[] }[] = [
  { href: '/', label: 'Tổng quan' },
  { href: '/dang-ky', label: 'Lập phiếu' },
  { href: '/phieu', label: 'Danh sách phiếu' },
  { href: '/admin', label: 'Quản trị', roles: ['admin', 'hcns'] },
]

export default function AppShell({
  user,
  children,
}: {
  user: { ho_ten: string; role: Role }
  children: React.ReactNode
}) {
  const items = NAV.filter((n) => !n.roles || n.roles.includes(user.role))
  return (
    <div className="min-h-screen">
      <header className="bg-surface border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
          <Link href="/" className="font-bold text-accent-600 shrink-0">
            VHJSC · VPP
          </Link>
          <nav className="flex items-center gap-1 flex-1">
            {items.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="px-3 py-1.5 rounded-lg text-sm text-foreground/80 hover:bg-accent-50 hover:text-accent-600"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-muted hidden sm:inline">{user.ho_ten}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
