'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export type NavModule = { key: string; ten: string; home: string; prefixes: string[]; nav: { href: string; label: string }[] }

// Menu theo MODULE đang mở: nhận diện module qua pathname (prefix khớp dài nhất),
// hiện menu con của module đó + nút "← Dịch vụ" quay ra hub.
export default function ModuleNav({ modules, nhieuModule }: { modules: NavModule[]; nhieuModule: boolean }) {
  const path = usePathname()

  let cur: NavModule | null = null
  let best = -1
  for (const m of modules) {
    for (const p of m.prefixes) {
      if ((path === p || path.startsWith(p + '/')) && p.length > best) {
        cur = m
        best = p.length
      }
    }
  }

  if (!cur) return <div className="flex-1" />

  return (
    <nav className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
      {nhieuModule && (
        <Link href="/" className="px-2 py-1.5 rounded-lg text-sm text-muted hover:text-accent-600 hover:bg-accent-50 shrink-0" title="Về trang dịch vụ">
          ← Dịch vụ
        </Link>
      )}
      <span className="px-2 text-sm font-semibold text-foreground/80 shrink-0 border-l border-border ml-1">{cur.ten}</span>
      {cur.nav.map((n) => {
        const active = path === n.href || path.startsWith(n.href + '/')
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
              active ? 'bg-accent text-white' : 'text-foreground/70 hover:text-accent-600 hover:bg-accent-50'
            }`}
          >
            {n.label}
          </Link>
        )
      })}
    </nav>
  )
}
