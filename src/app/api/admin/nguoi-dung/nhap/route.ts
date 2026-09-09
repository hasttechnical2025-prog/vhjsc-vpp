import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/session'
import { supabaseAdmin, selectAll } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const maxDuration = 60

// Sentinel: user import chưa có mật khẩu (đăng nhập bằng Google).
const KHONG_MAT_KHAU = 'SSO_NO_PASSWORD'

const boDau = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim()
const gonKhoang = (s: string) => s.replace(/\s+/g, ' ').trim()

// Một số tên phòng trong danh bạ HR khác cách gọi trong app → gộp về phòng đã có,
// tránh tạo trùng. Khoá = tên đã bỏ dấu; giá trị = tên đã bỏ dấu của phòng trong app.
const ALIAS: Record<string, string> = {
  'cn ho chi minh': 'chi nhanh hcm',
  'chi nhanh ho chi minh': 'chi nhanh hcm',
  'vpdd da nang': 'van phong da nang',
  'phong quan ly chat luong va chi phi': 'phong quan ly chi phi va chat luong',
}

type Row = { ho_ten?: string; email?: string; phong_ban?: string }

// Import danh sách user (Họ tên, Email, Phòng ban). Upsert theo email; user mới
// được cấp mặc định VPP: Người đề nghị. Tự TẠO phòng ban chưa có (đồng bộ theo
// danh bạ). KHÔNG ghi đè tài khoản super-admin/bảo vệ.
export async function POST(req: Request) {
  const session = await requireRole('admin')
  if (!session) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 })
  const body = await req.json().catch(() => null)
  const rows: Row[] = Array.isArray(body?.rows) ? body.rows : []
  if (rows.length === 0) return NextResponse.json({ error: 'File không có dòng nào' }, { status: 400 })

  const phong = await selectAll<{ id: string; ten: string }>((from, to) =>
    supabaseAdmin.from('vhjscvpp_phong_ban').select('id, ten').range(from, to),
  )
  const phongTheoTen = new Map(phong.map((p) => [boDau(p.ten), p.id])) // khoá bỏ dấu → id
  const users = await selectAll<{ id: string; email: string | null; bao_ve: boolean; sieu_admin: boolean }>((from, to) =>
    supabaseAdmin.from('vhjscvpp_nguoi_dung').select('id, email, bao_ve, sieu_admin').range(from, to),
  )
  const theoEmail = new Map(users.filter((u) => u.email).map((u) => [u.email!.toLowerCase(), u]))

  // 1) Gom & làm sạch, khử trùng theo email (ưu tiên dòng có phòng ban).
  type Sach = { ho_ten: string; email: string; phongKey: string; phongTen: string }
  const theoEmailSach = new Map<string, Sach>()
  let loi = 0
  for (const r of rows) {
    const ho_ten = gonKhoang(String(r.ho_ten ?? ''))
    const email = String(r.email ?? '').trim().toLowerCase()
    if (!ho_ten || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { loi++; continue }
    const ptenRaw = gonKhoang(String(r.phong_ban ?? ''))
    const key0 = boDau(ptenRaw)
    const phongKey = key0 ? (ALIAS[key0] ?? key0) : ''
    const cu = theoEmailSach.get(email)
    if (cu) { if (!cu.phongKey && phongKey) { cu.phongKey = phongKey; cu.phongTen = ptenRaw } continue }
    theoEmailSach.set(email, { ho_ten, email, phongKey, phongTen: ptenRaw })
  }
  const danhSach = [...theoEmailSach.values()]

  // 2) Tạo các phòng ban chưa có (đồng bộ theo danh bạ).
  const phongMoiTao: string[] = []
  const canTao = new Map<string, string>() // phongKey chưa có → tên hiển thị
  for (const s of danhSach) {
    if (s.phongKey && !phongTheoTen.has(s.phongKey) && !canTao.has(s.phongKey)) canTao.set(s.phongKey, s.phongTen)
  }
  if (canTao.size > 0) {
    const { data: pbMoi, error } = await supabaseAdmin
      .from('vhjscvpp_phong_ban')
      .insert([...canTao.values()].map((ten) => ({ ten })))
      .select('id, ten')
    if (error) return NextResponse.json({ error: 'Không tạo được phòng ban: ' + error.message }, { status: 500 })
    for (const p of pbMoi ?? []) { phongTheoTen.set(boDau(p.ten), p.id); phongMoiTao.push(p.ten) }
  }
  const idPhong = (s: Sach) => (s.phongKey ? phongTheoTen.get(s.phongKey) ?? null : null)

  // 3) Chia: cập nhật (đã có email) / bỏ qua (super-admin,bảo vệ) / thêm mới.
  let capNhat = 0, boQua = 0, them = 0
  let trongPhong = 0
  const themMoi: Sach[] = []
  for (const s of danhSach) {
    if (!s.phongKey) trongPhong++
    const cur = theoEmail.get(s.email)
    if (cur) {
      if (cur.bao_ve || cur.sieu_admin) { boQua++; continue }
      const upd: Record<string, unknown> = { ho_ten: s.ho_ten }
      const pid = idPhong(s)
      if (pid) upd.phong_ban_id = pid
      const { error } = await supabaseAdmin.from('vhjscvpp_nguoi_dung').update(upd).eq('id', cur.id)
      if (error) loi++; else capNhat++
    } else {
      themMoi.push(s)
    }
  }

  // 4) Thêm mới theo LÔ + cấp quyền mặc định theo LÔ.
  if (themMoi.length > 0) {
    const { data: ins, error } = await supabaseAdmin
      .from('vhjscvpp_nguoi_dung')
      .insert(
        themMoi.map((s) => ({
          ho_ten: s.ho_ten, email: s.email, username: s.email,
          password_hash: KHONG_MAT_KHAU, role: 'nguoi_de_nghi', phong_ban_id: idPhong(s), is_active: true,
        })),
      )
      .select('id')
    if (error) return NextResponse.json({ error: 'Không thêm được người dùng: ' + error.message }, { status: 500 })
    them = ins?.length ?? 0
    if (ins?.length) {
      const { error: eq } = await supabaseAdmin.from('vhjscvpp_quyen').upsert(
        ins.map((u) => ({ nguoi_dung_id: u.id, module: 'vpp', vai_tro: 'nguoi_de_nghi' })),
        { onConflict: 'nguoi_dung_id,module' },
      )
      if (eq) loi += ins.length // đã tạo user nhưng chưa gán được quyền
    }
  }

  return NextResponse.json({ ok: true, them, capNhat, boQua, loi, trongPhong, phongMoiTao })
}
