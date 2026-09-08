import { supabaseAdmin } from '@/lib/supabase-admin'
import type { NccNhomRow } from '@/lib/types'

// Danh mục Nhóm chi phí NCC (đã sắp theo thứ tự). Trả [] nếu bảng chưa tạo.
export async function getNccNhom(): Promise<NccNhomRow[]> {
  const { data, error } = await supabaseAdmin
    .from('vhjscvpp_ncc_nhom')
    .select('id, ten, thu_tu')
    .order('thu_tu', { ascending: true })
  if (error) return []
  return data as NccNhomRow[]
}
