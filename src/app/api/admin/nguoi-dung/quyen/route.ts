import { NextResponse } from 'next/server'
import { layPhien, cap } from '@/lib/guard'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { MODULES } from '@/lib/modules'

export const runtime = 'nodejs'

// Cấp quyền cho 1 user: cờ super-admin + vai trò theo từng module.
// body: { id, sieu_admin, quyen: { <module>: <vai_tro | ''> } }
export async function POST(req: Request) {
  const session = await layPhien()
  if (!session || !cap(session, 'quantri')) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  const b = await req.json().catch(() => null)
  const id = String(b?.id ?? '')
  if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 })

  // Tài khoản gốc (bảo vệ) luôn là super-admin — không ai gỡ được (chống tự khoá quản trị).
  const { data: tgt } = await supabaseAdmin.from('vhjscvpp_nguoi_dung').select('bao_ve').eq('id', id).maybeSingle()
  if (tgt?.bao_ve) return NextResponse.json({ error: 'Không thể đổi quyền tài khoản gốc được bảo vệ' }, { status: 403 })

  // cờ super-admin
  if (typeof b.sieu_admin === 'boolean') {
    await supabaseAdmin.from('vhjscvpp_nguoi_dung').update({ sieu_admin: b.sieu_admin }).eq('id', id)
  }

  const quyen = (b?.quyen ?? {}) as Record<string, string>
  for (const m of MODULES) {
    if (!m.vaiTro || m.vaiTro.length === 0) continue
    const vt = (quyen[m.key] ?? '').trim()
    if (!vt) {
      // bỏ quyền module này
      await supabaseAdmin.from('vhjscvpp_quyen').delete().eq('nguoi_dung_id', id).eq('module', m.key)
      continue
    }
    if (!m.vaiTro.some((v) => v.key === vt)) continue // vai trò không hợp lệ -> bỏ qua
    await supabaseAdmin
      .from('vhjscvpp_quyen')
      .upsert({ nguoi_dung_id: id, module: m.key, vai_tro: vt }, { onConflict: 'nguoi_dung_id,module' })
  }

  return NextResponse.json({ ok: true })
}
