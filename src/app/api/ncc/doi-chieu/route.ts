import { NextResponse } from 'next/server'
import { layPhien, cap } from '@/lib/guard'
import { supabaseAdmin, selectAll } from '@/lib/supabase-admin'
import type { NccRow } from '@/lib/types'

// Đối chiếu danh sách NCC từ file với NCC đã có: khớp theo MST (nếu có) -> fallback tên.
// Trả về: NCC mới, NCC trùng (kèm các trường sẽ được BỔ SUNG vì đang trống).
export const runtime = 'nodejs'

// Các trường có thể nhận từ file (ten là bắt buộc).
export const NCC_FIELDS = [
  'ten', 'ma_so_thue', 'dia_chi', 'so_dien_thoai', 'email', 'nguoi_lien_he',
  'nhom_chi_phi', 'loai_chi_phi', 'co_hoa_don', 'tan_suat_thanh_toan',
  'ngay_den_han', 'hop_dong_mo_ta', 'hop_dong_het_han', 'ghi_chu',
] as const
type NccField = (typeof NCC_FIELDS)[number]
type FileRow = Partial<Record<NccField, string | null>>

const mstKey = (s: unknown) => String(s ?? '').replace(/\D/g, '')
const nameKey = (s: unknown) =>
  String(s ?? '').normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const rong = (v: unknown) => v == null || String(v).trim() === ''

export async function POST(req: Request) {
  const session = await layPhien()
  if (!session || !cap(session, 'ncc.vao')) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  const body = await req.json().catch(() => null)
  const rows: FileRow[] = Array.isArray(body?.rows) ? body.rows : []
  if (rows.length === 0) return NextResponse.json({ error: 'File không có dòng NCC nào' }, { status: 400 })

  const existing = await selectAll<NccRow>((from, to) =>
    supabaseAdmin.from('vhjscvpp_ncc').select('*').range(from, to),
  )
  const theoMst = new Map<string, NccRow>()
  const theoTen = new Map<string, NccRow>()
  for (const e of existing) {
    const mk = mstKey(e.ma_so_thue)
    if (mk) theoMst.set(mk, e)
    const nk = nameKey(e.ten)
    if (nk && !theoTen.has(nk)) theoTen.set(nk, e)
  }

  const moi: FileRow[] = []
  const trung: { existingId: string; existingTen: string; row: FileRow; boSung: NccField[] }[] = []
  let trungKhongBoSung = 0

  for (const r of rows) {
    if (rong(r.ten)) continue
    const mk = mstKey(r.ma_so_thue)
    const hit = (mk && theoMst.get(mk)) || theoTen.get(nameKey(r.ten)) || null
    if (!hit) { moi.push(r); continue }
    // Trường sẽ bổ sung: existing đang trống mà file có giá trị (không tính 'ten')
    const boSung = NCC_FIELDS.filter(
      (f) => f !== 'ten' && !rong(r[f]) && rong((hit as unknown as Record<string, unknown>)[f]),
    )
    if (boSung.length === 0) trungKhongBoSung++
    else trung.push({ existingId: hit.id, existingTen: hit.ten, row: r, boSung })
  }

  return NextResponse.json({ tongDong: rows.length, moi, trung, trungKhongBoSung })
}
