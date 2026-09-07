import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { moduleChoVaiTro } from '@/lib/modules'

// Trang chủ = HUB dịch vụ: các thẻ module mà user được phép dùng.
export default async function HubPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const modules = moduleChoVaiTro(session.role)
  // Người dùng chỉ có đúng 1 module -> vào thẳng module đó (bỏ qua hub).
  if (modules.length === 1) redirect(modules[0].home)

  return (
    <>
      <h1 className="text-xl font-bold mb-1">Xin chào, {session.phong_ban_ten || session.ho_ten}</h1>
      <p className="text-sm text-muted mb-6">Chọn một dịch vụ hành chính để bắt đầu.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((m) => (
          <Link key={m.key} href={m.home} className="card p-5 hover:border-accent transition-colors flex gap-4 items-start">
            <div className="text-3xl leading-none shrink-0" aria-hidden>{m.icon}</div>
            <div className="min-w-0">
              <div className="font-semibold text-accent-600">{m.ten}</div>
              <div className="text-sm text-muted mt-1">{m.mo_ta}</div>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
