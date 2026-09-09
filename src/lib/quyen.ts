import { supabaseAdmin, selectAll } from '@/lib/supabase-admin'
import { MODULES } from '@/lib/modules'

// Quyền per-cá-nhân × per-module. Super-admin (sieu_admin) có tất cả.
// Việc CHẶN quyền do src/lib/guard.ts thực thi (layPhien + cap); các hàm ở đây
// dùng cho màn hình Quản trị (đọc/hiển thị grant của user).

export type QuyenUser = Record<string, string> // module -> vai_tro

export async function getQuyenCuaUser(userId: string): Promise<QuyenUser> {
  const { data } = await supabaseAdmin.from('vhjscvpp_quyen').select('module, vai_tro').eq('nguoi_dung_id', userId)
  const o: QuyenUser = {}
  for (const r of data || []) o[r.module] = r.vai_tro
  return o
}

// Toàn bộ quyền của mọi user (cho màn hình quản trị): userId -> {module: vai_tro}.
export async function getQuyenTatCa(): Promise<Record<string, QuyenUser>> {
  const rows = await selectAll<{ nguoi_dung_id: string; module: string; vai_tro: string }>((from, to) =>
    supabaseAdmin.from('vhjscvpp_quyen').select('nguoi_dung_id, module, vai_tro').range(from, to),
  )
  const o: Record<string, QuyenUser> = {}
  for (const r of rows) {
    if (!o[r.nguoi_dung_id]) o[r.nguoi_dung_id] = {}
    o[r.nguoi_dung_id][r.module] = r.vai_tro
  }
  return o
}

// Các module CÓ bộ vai trò để cấp quyền (bỏ qua module chỉ super-admin).
export function moduleCoVaiTro() {
  return MODULES.filter((m) => m.vaiTro && m.vaiTro.length > 0)
}
