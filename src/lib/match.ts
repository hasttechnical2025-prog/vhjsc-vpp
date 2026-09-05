// Chuẩn hoá tên hàng để đối chiếu giữa danh mục và file báo giá mới.
// NCC không có mã hàng nên phải khớp theo tên (trong cùng nhóm hàng).
export function chuanHoaTen(s: string | null | undefined): string {
  return (s || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function khoaNhom(nhom: string | null | undefined): string {
  return (nhom || '').trim().toLowerCase()
}
