import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin, selectAll } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

// Sentinel: user import chưa có mật khẩu (đăng nhập bằng Google ở bước sau).
const KHONG_MAT_KHAU = 'SSO_NO_PASSWORD'

const boDau = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim()

type Row = { ho_ten?: string; email?: string; phong_ban?: string }

// Import danh sách user (Họ tên, Email, Phòng ban). Upsert theo email; user mới
// được cấp mặc định VPP: Người đề nghị. KHÔNG ghi đè tài khoản super-admin/bảo vệ.
export async function POST(req: Request) {
  const session = await requireRole('admin')
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  const body = await req.json().catch(() => null)
  const rows: Row[] = Array.isArray(body?.rows) ? body.rows : []
  if (rows.length === 0) return NextResponse.json({ error: 'File không có dòng nào' }, { status: 400 })

  const phong = await selectAll<{ id: string; ten: string }>((from, to) =>
    supabaseAdmin.from('vhjscvpp_phong_ban').select('id, ten').range(from, to),
  )
  const phongTheoTen = new Map(phong.map((p) => [boDau(p.ten), p.id]))
  const users = await selectAll<{ id: string; email: string | null; bao_ve: boolean; sieu_admin: boolean }>((from, to) =>
    supabaseAdmin.from('vhjscvpp_nguoi_dung').select('id, email, bao_ve, sieu_admin').range(from, to),
  )
  const theoEmail = new Map(users.filter((u) => u.email).map((u) => [u.email!.toLowerCase(), u]))

  let them = 0, capNhat = 0, boQua = 0, loi = 0
  const khongKhopPhong = new Set<string>()

  for (const r of rows) {
    const ho_ten = String(r.ho_ten ?? '').replace(/\s+/g, ' ').trim()
    const email = String(r.email ?? '').trim().toLowerCase()
    if (!ho_ten || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { loi++; continue }
    const pten = String(r.phong_ban ?? '').trim()
    const phong_ban_id = pten ? phongTheoTen.get(boDau(pten)) ?? null : null
    if (pten && !phong_ban_id) khongKhopPhong.add(pten)

    const cur = theoEmail.get(email)
    if (cur) {
      if (cur.bao_ve || cur.sieu_admin) { boQua++; continue } // không đụng super-admin
      const upd: Record<string, unknown> = { ho_ten }
      if (phong_ban_id) upd.phong_ban_id = phong_ban_id
      const { error } = await supabaseAdmin.from('vhjscvpp_nguoi_dung').update(upd).eq('id', cur.id)
      if (error) loi++; else capNhat++
      continue
    }

    const { data: ins, error } = await supabaseAdmin
      .from('vhjscvpp_nguoi_dung')
      .insert({ ho_ten, email, username: email, password_hash: KHONG_MAT_KHAU, role: 'nguoi_de_nghi', phong_ban_id, is_active: true })
      .select('id')
      .single()
    if (error || !ins) { loi++; continue }
    them++
    theoEmail.set(email, { id: ins.id, email, bao_ve: false, sieu_admin: false })
    // Mặc định: VPP - Người đề nghị
    await supabaseAdmin.from('vhjscvpp_quyen').upsert(
      { nguoi_dung_id: ins.id, module: 'vpp', vai_tro: 'nguoi_de_nghi' },
      { onConflict: 'nguoi_dung_id,module' },
    )
  }

  return NextResponse.json({ ok: true, them, capNhat, boQua, loi, khongKhopPhong: [...khongKhopPhong] })
}
