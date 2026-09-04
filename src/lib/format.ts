// Quy tắc hiển thị: tiền #.### (dấu chấm ngăn nghìn), ngày DD/MM/YYYY.

export function formatTien(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return ''
  return Math.round(value).toLocaleString('vi-VN')
}

export function formatDate(input: string | Date | null | undefined): string {
  if (!input) return ''
  const d = typeof input === 'string' ? new Date(input) : input
  if (isNaN(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

// "2026-09" -> "09/2026"
export function formatThang(thang: string | null | undefined): string {
  if (!thang) return ''
  const [y, m] = thang.split('-')
  if (!y || !m) return thang
  return `${m}/${y}`
}

// Tháng hiện tại dạng "YYYY-MM"
export function thangHienTai(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
