import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSession, type SessionUser } from '@/lib/session'
import { MODULES, type AppModule, type ModuleNavItem } from '@/lib/modules'

// Phân quyền theo CÁ NHÂN × MODULE (thay cho gate theo cột `role` cũ).
// - sieu_admin: toàn quyền mọi module (bỏ qua mọi kiểm tra).
// - quyen[module] = vai_tro của user ở module đó (vpp: nguoi_de_nghi|duyet|quan_ly;
//   ncc: xem|quan_ly; quantri: quan_tri).
export type Phien = SessionUser & { sieu_admin: boolean; quyen: Record<string, string> }

// Đọc phiên + quyền từ DB mỗi lần (tắt is_active hoặc gỡ quyền là chặn được ngay,
// kể cả gọi API trực tiếp). Trả null nếu chưa đăng nhập / bị khoá.
export async function layPhien(): Promise<Phien | null> {
  const s = await getSession()
  if (!s) return null
  const { data } = await supabaseAdmin
    .from('vhjscvpp_nguoi_dung')
    .select('is_active, sieu_admin')
    .eq('id', s.id)
    .single()
  if (!data || data.is_active === false) return null
  const { data: qs } = await supabaseAdmin
    .from('vhjscvpp_quyen')
    .select('module, vai_tro')
    .eq('nguoi_dung_id', s.id)
  const quyen: Record<string, string> = {}
  for (const r of qs || []) quyen[r.module] = r.vai_tro
  return { ...s, sieu_admin: !!data.sieu_admin, quyen }
}

// Kiểm tra một "khả năng" (capability). Super-admin có tất cả; token rỗng = mọi
// user đã đăng nhập. Đây là nơi DUY NHẤT quy đổi vai_tro per-module → quyền thao tác.
export function cap(p: Phien, token?: string): boolean {
  if (!token) return true
  if (p.sieu_admin) return true
  const v = (m: string) => p.quyen[m]
  switch (token) {
    case 'vpp.vao': return !!v('vpp')
    case 'vpp.duyet': return v('vpp') === 'duyet' || v('vpp') === 'quan_ly'
    case 'vpp.quan_ly': return v('vpp') === 'quan_ly'
    case 'ncc.vao': return !!v('ncc')
    case 'ncc.quan_ly': return v('ncc') === 'quan_ly'
    case 'quantri': return v('quantri') === 'quan_tri'
    default: return false
  }
}

// Module hiển thị trên hub / nav theo quyền.
export function moduleChoQuyen(p: Phien): AppModule[] {
  return MODULES.filter((m) => cap(p, m.capVao))
}
export function navChoQuyen(m: AppModule, p: Phien): ModuleNavItem[] {
  return m.nav.filter((n) => cap(p, n.can))
}
