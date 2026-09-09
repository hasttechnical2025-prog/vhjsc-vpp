import { NextResponse } from 'next/server'
import { layPhien, cap } from '@/lib/guard'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { NCC_FIELDS } from '@/app/api/ncc/doi-chieu/route'

export const runtime = 'nodejs'

const rong = (v: unknown) => v == null || String(v).trim() === ''
const chuan = (r: Record<string, unknown>) => {
  const o: Record<string, unknown> = {}
  for (const f of NCC_FIELDS) {
    if (rong(r[f])) continue
    o[f] = f === 'hop_dong_het_han' ? r[f] : String(r[f]).trim()
  }
  return o
}

// Thêm NCC mới + BỔ SUNG (chỉ điền ô đang trống) cho NCC trùng đã chọn.
export async function POST(req: Request) {
  const session = await layPhien()
  if (!session || !cap(session, 'ncc.quan_ly')) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  const body = await req.json().catch(() => null)
  const them: Record<string, unknown>[] = Array.isArray(body?.them) ? body.them : []
  const capNhat: { id: string; row: Record<string, unknown> }[] = Array.isArray(body?.capNhat) ? body.capNhat : []

  let soThem = 0
  const rowsThem = them
    .filter((r) => !rong(r.ten))
    .map((r) => ({ ...chuan(r), ten: String(r.ten).trim(), trang_thai: 'dang_dung' }))
  if (rowsThem.length) {
    const { error } = await supabaseAdmin.from('vhjscvpp_ncc').insert(rowsThem)
    if (error) return NextResponse.json({ error: 'Thêm NCC mới thất bại: ' + error.message }, { status: 500 })
    soThem = rowsThem.length
  }

  // Bổ sung: nạp lại bản ghi hiện tại, chỉ update ô đang trống
  let soCapNhat = 0
  for (const c of capNhat) {
    const { data: cur } = await supabaseAdmin.from('vhjscvpp_ncc').select('*').eq('id', c.id).maybeSingle()
    if (!cur) continue
    const upd: Record<string, unknown> = {}
    for (const f of NCC_FIELDS) {
      if (f === 'ten') continue
      if (!rong(c.row[f]) && rong((cur as Record<string, unknown>)[f])) {
        upd[f] = f === 'hop_dong_het_han' ? c.row[f] : String(c.row[f]).trim()
      }
    }
    if (Object.keys(upd).length === 0) continue
    upd.updated_at = new Date().toISOString()
    const { error } = await supabaseAdmin.from('vhjscvpp_ncc').update(upd).eq('id', c.id)
    if (!error) soCapNhat++
  }

  return NextResponse.json({ ok: true, soThem, soCapNhat })
}
