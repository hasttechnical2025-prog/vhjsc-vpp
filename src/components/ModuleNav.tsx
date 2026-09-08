'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export type NavModule = { key: string; ten: string; home: string; prefixes: string[]; nav: { href: string; label: string }[] }

// Menu theo MODULE đang mở: nhận diện module qua pathname (prefix khớp dài nhất),
// hiện menu con của module đó + nút "← Dịch vụ" quay ra hub.
export default function ModuleNav({ modules }: { modules: NavModule[] }) {
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

  // Ở trang chủ hub (không thuộc module nào) -> không hiện thanh menu.
  if (!cur) return null

  // Mục đang active = href KHỚP DÀI NHẤT với path (để /vpp/phieu chọn "Danh sách phiếu"
  // chứ không phải "Tổng quan" /vpp).
  let activeHref = ''
  for (const n of cur.nav) {
    if ((path === n.href || path.startsWith(n.href + '/')) && n.href.length > activeHref.length) activeHref = n.href
  }

  return (
    <div className="border-t border-border bg-surface">
      <nav className="max-w-6xl mx-auto px-4 py-1.5 flex items-center gap-1 flex-wrap">
        <Link href="/" className="px-2 py-1.5 rounded-lg text-sm text-muted hover:text-accent-600 hover:bg-accent-50" title="Về trang dịch vụ">
          ← Dịch vụ
        </Link>
        <span className="pl-2 pr-3 mr-1 text-sm font-semibold text-foreground/80 border-r border-border">{cur.ten}</span>
        {cur.nav.map((n) => {
          const active = n.href === activeHref
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-accent text-white' : 'text-foreground/70 hover:text-accent-600 hover:bg-accent-50'
              }`}
            >
              {n.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
