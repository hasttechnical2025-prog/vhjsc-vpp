import { supabaseAdmin } from '@/lib/supabase-admin'

export type CauHinh = {
  brand_text: string
  logo_url: string | null
}

const MAC_DINH: CauHinh = { brand_text: 'VHJSC · VPP', logo_url: null }

// Đọc cấu hình hiển thị (chữ thương hiệu, logo) từ bảng key-value.
export async function getCauHinh(): Promise<CauHinh> {
  try {
    const { data } = await supabaseAdmin.from('vhjscvpp_cauhinh').select('key, value')
    const m = new Map((data || []).map((r: { key: string; value: string | null }) => [r.key, r.value]))
    return {
      brand_text: m.get('brand_text') || MAC_DINH.brand_text,
      logo_url: m.get('logo_url') || null,
    }
  } catch {
    return MAC_DINH
  }
}
