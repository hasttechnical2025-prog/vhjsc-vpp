'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Thanh menu chính — đậm + đánh dấu trang đang xem.
export default function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname()
  return (
    <nav className="flex items-center gap-1 flex-1">
      {items.map((n) => {
        const active = n.href === '/' ? path === '/' : path.startsWith(n.href)
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-accent text-white'
                : 'text-foreground/70 hover:text-accent-600 hover:bg-accent-50'
            }`}
          >
            {n.label}
          </Link>
        )
      })}
    </nav>
  )
}
