// Tra cứu tình trạng hoạt động của doanh nghiệp theo MST qua API VietQR
// (api.vietqr.io — bên thứ 3, tổng hợp từ dữ liệu công khai, KHÔNG captcha,
// KHÔNG phải cổng Nhà nước). Trả trạng thái + tên + địa chỉ chuẩn.
export type KetQuaMst = { ok: boolean; trang_thai?: string; ten?: string; dia_chi?: string; loi?: string }

export async function traCuuMst(mst: string | null | undefined): Promise<KetQuaMst> {
  const so = String(mst ?? '').replace(/\D/g, '')
  if (!so || so.length < 10) return { ok: false, loi: 'MST không hợp lệ' }
  try {
    const r = await fetch(`https://api.vietqr.io/v2/business/${so}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 VHJSC' },
    })
    if (!r.ok) return { ok: false, loi: `HTTP ${r.status}` }
    const j = await r.json()
    if (j?.code === '00' && j?.data) {
      return { ok: true, trang_thai: j.data.status || 'Không rõ', ten: j.data.name || undefined, dia_chi: j.data.address || undefined }
    }
    return { ok: false, loi: 'Không tìm thấy MST' }
  } catch {
    return { ok: false, loi: 'Lỗi kết nối tra cứu' }
  }
}

// Phân loại để tô màu badge.
export type LoaiTrangThai = 'hoat_dong' | 'ngung' | 'tam_nghi' | 'khac'
export function phanLoaiMst(s: string | null | undefined): LoaiTrangThai {
  const t = (s || '').toLowerCase()
  if (!t) return 'khac'
  if (t.includes('đang hoạt động') || t.includes('dang hoat dong')) return 'hoat_dong'
  if (t.includes('tạm') || t.includes('tam ')) return 'tam_nghi'
  if (t.includes('ngừng') || t.includes('ngung') || t.includes('giải thể') || t.includes('giai the') || t.includes('đóng') || t.includes('chấm dứt')) return 'ngung'
  return 'khac'
}

export const MAU_MST: Record<LoaiTrangThai, string> = {
  hoat_dong: 'bg-ok/10 text-ok',
  ngung: 'bg-danger/10 text-danger',
  tam_nghi: 'bg-warn/10 text-warn',
  khac: 'bg-accent-50 text-muted',
}
