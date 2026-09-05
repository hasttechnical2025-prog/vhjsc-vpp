import { supabaseAdmin } from '@/lib/supabase-admin'

export type CauHinh = {
  brand_text: string
  logo_url: string | null
}

const MAC_DINH: CauHinh = { brand_text: 'VHJSC · VPP', logo_url: null }

// Nhớ tạm trong bộ nhớ tiến trình (cấu hình gần như không đổi) -> khỏi query DB
// mỗi lần điều hướng. TTL ngắn để thay đổi của admin xuất hiện sớm.
let _cache: { data: CauHinh; at: number } | null = null
const TTL_MS = 60_000

export function xoaCacheCauHinh() {
  _cache = null
}

// Đọc cấu hình hiển thị (chữ thương hiệu, logo) từ bảng key-value.
export async function getCauHinh(): Promise<CauHinh> {
  if (_cache && Date.now() - _cache.at < TTL_MS) return _cache.data
  try {
    const { data } = await supabaseAdmin.from('vhjscvpp_cauhinh').select('key, value')
    const m = new Map((data || []).map((r: { key: string; value: string | null }) => [r.key, r.value]))
    const kq: CauHinh = {
      brand_text: m.get('brand_text') || MAC_DINH.brand_text,
      logo_url: m.get('logo_url') || null,
    }
    _cache = { data: kq, at: Date.now() }
    return kq
  } catch {
    return MAC_DINH
  }
}
