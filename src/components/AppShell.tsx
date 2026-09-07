import Link from 'next/link'
import LogoutButton from './LogoutButton'
import ModuleNav from './ModuleNav'
import { getCauHinh } from '@/lib/config'
import type { Role } from '@/lib/session'
import { moduleChoVaiTro, navChoVaiTro } from '@/lib/modules'

export default async function AppShell({
  user,
  children,
}: {
  user: { ho_ten: string; role: Role; phong_ban_ten?: string | null }
  children: React.ReactNode
}) {
  const cauHinh = await getCauHinh()
  const modules = moduleChoVaiTro(user.role)
  const navModules = modules.map((m) => ({
    key: m.key,
    ten: m.ten,
    home: m.home,
    prefixes: m.prefixes,
    nav: navChoVaiTro(m, user.role).map((n) => ({ href: n.href, label: n.label })),
  }))
  const tenHienThi = user.phong_ban_ten || user.ho_ten

  return (
    <div className="min-h-screen">
      <header className="bg-surface border-b border-border sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-accent-600 shrink-0">
            {cauHinh.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cauHinh.logo_url} alt="Logo" className="h-9 w-auto object-contain" />
            ) : null}
            <span className="hidden md:inline">{cauHinh.brand_text}</span>
          </Link>
          <ModuleNav modules={navModules} nhieuModule={modules.length > 1} />
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
