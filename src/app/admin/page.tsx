import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase-admin'
import AppShell from '@/components/AppShell'

export default async function AdminPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin' && session.role !== 'hcns') redirect('/')

  const [{ data: users }, { data: phongBan }, { count: soSanPham }] = await Promise.all([
    supabaseAdmin.from('vhjscvpp_nguoi_dung').select('ho_ten, username, role, is_active').order('created_at'),
    supabaseAdmin.from('vhjscvpp_phong_ban').select('ten, ma').order('ten'),
    supabaseAdmin.from('vhjscvpp_san_pham').select('*', { count: 'exact', head: true }),
  ])

  const roleLabel: Record<string, string> = {
    admin: 'Quản trị',
    hcns: 'HCNS',
    nguoi_de_nghi: 'Người đề nghị',
  }

  return (
    <AppShell user={session}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Quản trị</h1>
        <div className="flex items-center gap-2">
          {session.role === 'admin' && (
            <Link
              href="/admin/nguoi-dung"
              className="card px-4 py-2 text-sm font-medium hover:border-accent"
            >
              Người dùng & Phòng ban
            </Link>
          )}
          {session.role === 'admin' && (
            <Link
              href="/admin/cau-hinh"
              className="card px-4 py-2 text-sm font-medium hover:border-accent"
            >
              Cấu hình hiển thị
            </Link>
          )}
          <Link
            href="/admin/cap-nhat-gia"
            className="bg-accent hover:bg-accent-600 text-white rounded-lg px-4 py-2 text-sm font-medium"
          >
            Cập nhật giá từ báo giá
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-4">
          <div className="font-semibold mb-3">Người dùng ({users?.length || 0})</div>
          <table className="w-full text-sm">
            <thead className="text-muted text-left">
              <tr>
                <th className="py-1">Họ tên</th>
                <th className="py-1">Tài khoản</th>
                <th className="py-1">Vai trò</th>
                <th className="py-1">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {(users || []).map((u) => (
                <tr key={u.username} className="border-t border-border">
                  <td className="py-1.5">{u.ho_ten}</td>
                  <td className="py-1.5">{u.username}</td>
                  <td className="py-1.5">{roleLabel[u.role] || u.role}</td>
                  <td className="py-1.5">
                    {u.is_active ? (
                      <span className="text-ok">Hoạt động</span>
                    ) : (
                      <span className="text-muted">Khoá</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-6">
          <div className="card p-4">
            <div className="font-semibold mb-3">Phòng ban ({phongBan?.length || 0})</div>
            <ul className="text-sm space-y-1">
              {(phongBan || []).map((p) => (
                <li key={p.ten} className="border-t border-border py-1.5 first:border-0">
                  {p.ten} {p.ma ? <span className="text-muted">· {p.ma}</span> : null}
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-4">
            <div className="font-semibold mb-1">Danh mục sản phẩm</div>
            <div className="text-3xl font-bold text-accent-600">{(soSanPham || 0).toLocaleString('vi-VN')}</div>
            <div className="text-sm text-muted">sản phẩm đã import từ file báo giá</div>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted mt-6">
        Quản lý người dùng / phòng ban / bật-tắt sản phẩm chi tiết sẽ bổ sung ở bước sau.
      </p>
    </AppShell>
  )
}
