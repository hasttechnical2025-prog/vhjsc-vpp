import { supabaseAdmin, selectAll } from '@/lib/supabase-admin'
import type { SanPham } from '@/lib/types'

// Nhớ tạm danh mục sản phẩm đang bán (634 dòng) trong bộ nhớ tiến trình để trang
// Lập phiếu không phải tải lại toàn bộ mỗi lần điều hướng. Xoá cache khi giá đổi.
let _cache: { data: SanPham[]; at: number } | null = null
const TTL_MS = 120_000

export function xoaCacheSanPham() {
  _cache = null
}

export async function getSanPhamDangBan(): Promise<SanPham[]> {
  if (_cache && Date.now() - _cache.at < TTL_MS) return _cache.data
  const data = await selectAll<SanPham>((from, to) =>
    supabaseAdmin
      .from('vhjscvpp_san_pham')
      .select('id, nhom_hang, ten, xuat_xu, quy_cach, dvt, don_gia, anh_url, dang_ban')
      .eq('dang_ban', true)
      .order('id', { ascending: true })
      .range(from, to),
  )
  _cache = { data, at: Date.now() }
  return data
}
