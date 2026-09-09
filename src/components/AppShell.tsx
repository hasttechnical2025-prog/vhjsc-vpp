import Link from 'next/link'
import LogoutButton from './LogoutButton'
import ModuleNav from './ModuleNav'
import { getCauHinh } from '@/lib/config'
import { moduleChoQuyen, navChoQuyen, type Phien } from '@/lib/guard'

export default async function AppShell({
  phien,
  children,
}: {
  phien: Phien
  children: React.ReactNode
}) {
  const cauHinh = await getCauHinh()
  const modules = moduleChoQuyen(phien)
  const navModules = modules.map((m) => ({
    key: m.key,
    ten: m.ten,
    home: m.home,
    prefixes: m.prefixes,
    nav: navChoQuyen(m, phien).map((n) => ({ href: n.href, label: n.label })),
  }))
  const tenHienThi = phien.phong_ban_ten || phien.ho_ten

  return (
    <div className="min-h-screen">
      <header className="bg-surface border-b border-border sticky top-0 z-40">
        {/* Hàng 1: thương hiệu + người dùng + đăng xuất */}
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-accent-600 shrink-0">
            {cauHinh.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cauHinh.logo_url} alt="Logo" className="h-9 w-auto object-contain" />
            ) : null}
            <span>{cauHinh.brand_text}</span>
          </Link>
          <div className="flex-1" />
          <span className="text-sm text-muted hidden sm:inline">{tenHienThi}</span>
          <LogoutButton />
        </div>
        {/* Hàng 2: thanh menu của module đang mở (ẩn khi ở trang chủ hub) */}
        <ModuleNav modules={navModules} />
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
