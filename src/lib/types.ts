export type PhongBanRow = { id: string; ten: string; ma: string | null; truong_bo_phan: string | null }

export type NccRow = {
  id: string
  ten: string
  ma_so_thue: string | null
  dia_chi: string | null
  so_dien_thoai: string | null
  email: string | null
  nguoi_lien_he: string | null
  nhom_chi_phi: string | null
  loai_chi_phi: string | null
  co_hoa_don: string | null
  tan_suat_thanh_toan: string | null
  ngay_den_han: string | null
  hop_dong_mo_ta: string | null
  hop_dong_het_han: string | null
  trang_thai: string
  ghi_chu: string | null
  mst_trang_thai: string | null
  mst_kiem_tra_luc: string | null
}

export type NccDanhGiaRow = {
  id: string
  ncc_id: string
  ky: string
  diem_chat_luong: number | null
  diem_gia: number | null
  diem_tien_do: number | null
  diem_ho_tro: number | null
  diem_chung_tu: number | null
  diem_tong: number | null
  xep_loai: string | null
  nhan_xet: string | null
  de_xuat: string | null
  nguoi_cham_ten: string | null
  created_at: string
}

export type NccTepRow = { id: string; ncc_id: string; ten_tep: string; url: string; created_at: string }

export type NccNhomRow = { id: string; ten: string; thu_tu: number }
export type NguoiDungRow = {
  id: string
  ho_ten: string
  username: string
  role: 'admin' | 'hcns' | 'nguoi_de_nghi'
  is_active: boolean
  phong_ban_id: string | null
  bao_ve: boolean
}

export type SanPham = {
  id: number
  nhom_hang: string
  ten: string
  xuat_xu: string | null
  quy_cach: string | null
  dvt: string | null
  don_gia: number | null
  anh_url: string | null
  dang_ban: boolean
  bien_the: string[] | null
}

export type TrangThaiPhieu = 'cho_duyet' | 'da_duyet' | 'tu_choi'

export const NHAN_TRANG_THAI: Record<TrangThaiPhieu, string> = {
  cho_duyet: 'Chờ duyệt',
  da_duyet: 'Đã duyệt',
  tu_choi: 'Từ chối',
}

export type PhieuDong = {
  id?: string
  san_pham_id: number | null
  ten_tay: string | null
  dvt: string | null
  don_gia: number | null
  so_luong: number
  ghi_chu: string | null
  thu_tu: number
}

export type Phieu = {
  id: string
  phong_ban_id: string | null
  phong_ban_ten: string
  nguoi_de_nghi_id: string | null
  nguoi_de_nghi_ten: string
  thang: string
  tieu_de: string | null
  // Dùng chung cho cả phiếu (không theo từng dòng)
  thoi_gian_can: string | null
  ke_hoach_su_dung: string | null
  trang_thai: TrangThaiPhieu
  ghi_chu: string | null
  tong_tien: number
  nguoi_duyet_ten: string | null
  thoi_diem_duyet: string | null
  ly_do_tu_choi: string | null
  created_at: string
}
