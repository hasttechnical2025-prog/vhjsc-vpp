export type PhongBanRow = { id: string; ten: string; ma: string | null }
export type NguoiDungRow = {
  id: string
  ho_ten: string
  username: string
  role: 'admin' | 'hcns' | 'nguoi_de_nghi'
  is_active: boolean
  phong_ban_id: string | null
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
}

export type TrangThaiPhieu = 'nhap' | 'hoan_tat'

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
  created_at: string
}
