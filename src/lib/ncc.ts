// Chấm điểm & xếp loại nhà cung cấp theo bộ tiêu chí có trọng số.

export const TIEU_CHI = [
  { key: 'diem_chat_luong', nhan: 'Chất lượng hàng hóa/dịch vụ', trong_so: 0.3 },
  { key: 'diem_gia', nhan: 'Giá cả cạnh tranh', trong_so: 0.25 },
  { key: 'diem_tien_do', nhan: 'Tiến độ giao / đáp ứng', trong_so: 0.2 },
  { key: 'diem_ho_tro', nhan: 'Hỗ trợ & thái độ hợp tác', trong_so: 0.15 },
  { key: 'diem_chung_tu', nhan: 'Chứng từ/hóa đơn hợp lệ, đúng hạn', trong_so: 0.1 },
] as const

export type DiemTieuChi = {
  diem_chat_luong: number
  diem_gia: number
  diem_tien_do: number
  diem_ho_tro: number
  diem_chung_tu: number
}

export type XepLoai = 'A' | 'B' | 'C'

export const NHAN_XEP_LOAI: Record<XepLoai, string> = {
  A: 'A — Tốt',
  B: 'B — Đạt',
  C: 'C — Cân nhắc thay',
}

export const NHAN_DE_XUAT: Record<string, string> = {
  tiep_tuc: 'Tiếp tục hợp tác',
  theo_doi: 'Tiếp tục nhưng theo dõi',
  thay_the: 'Cân nhắc thay thế',
}

// Điểm tổng (thang 5) có trọng số; điểm nào trống coi như 0.
export function tinhDiemTong(d: Partial<DiemTieuChi>): number {
  let tong = 0
  for (const t of TIEU_CHI) tong += (Number(d[t.key]) || 0) * t.trong_so
  return Math.round(tong * 100) / 100
}

export function xepLoai(diemTong: number): XepLoai {
  if (diemTong >= 4) return 'A'
  if (diemTong >= 2.5) return 'B'
  return 'C'
}

export const MAU_XEP_LOAI: Record<XepLoai, string> = {
  A: 'bg-ok/10 text-ok',
  B: 'bg-warn/10 text-warn',
  C: 'bg-danger/10 text-danger',
}
