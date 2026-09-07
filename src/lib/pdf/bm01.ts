import PdfPrinter from 'pdfmake'
import type { TDocumentDefinitions } from 'pdfmake/interfaces'
import { formatThang } from '@/lib/format'

// Nạp font Roboto (kèm dấu tiếng Việt) từ vfs base64 -> Buffer, không cần đọc file
// trên đĩa (ổn định trên Vercel serverless).
let printer: PdfPrinter | null = null
async function getPrinter(): Promise<PdfPrinter> {
  if (printer) return printer
  const mod = (await import('pdfmake/build/vfs_fonts')) as unknown as Record<string, unknown>
  const anyMod = mod as any
  const vfs: Record<string, string> =
    anyMod.default?.pdfMake?.vfs || anyMod.pdfMake?.vfs || anyMod.default?.vfs || anyMod.vfs || anyMod.default || anyMod
  const b = (name: string) => Buffer.from(vfs[name], 'base64')
  printer = new PdfPrinter({
    Roboto: {
      normal: b('Roboto-Regular.ttf'),
      bold: b('Roboto-Medium.ttf'),
      italics: b('Roboto-Italic.ttf'),
      bolditalics: b('Roboto-MediumItalic.ttf'),
    },
  })
  return printer
}

type Phieu = {
  nguoi_de_nghi_ten: string
  phong_ban_ten: string
  truong_bo_phan: string | null
  thang: string
  tieu_de: string | null
  thoi_gian_can: string | null
  ke_hoach_su_dung: string | null
  created_at?: string | null
}
type Dong = {
  ten_hang: string | null
  ten_tay: string | null
  dvt: string | null
  so_luong: number
  ghi_chu: string | null
}

export async function buildBM01(phieu: Phieu, rows: Dong[]): Promise<Buffer> {
  const pr = await getPrinter()

  const soDong = rows.length || 1
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const thHeader: any[] = ['TT', 'Tên TTB/VPP', 'Đơn vị tính', 'Số lượng', 'Thời gian cần', 'Kế hoạch sử dụng', 'Ghi chú'].map(
    (t) => ({ text: t, bold: true, fillColor: '#eef2f7', alignment: 'center', fontSize: 9 }),
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any[] = [thHeader]
  rows.forEach((d, i) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row: any[] = [
      { text: String(i + 1), alignment: 'center', fontSize: 9 },
      { text: d.ten_hang || d.ten_tay || '', fontSize: 9 },
      { text: d.dvt || '', alignment: 'center', fontSize: 9 },
      { text: d.so_luong != null ? String(d.so_luong) : '', alignment: 'center', fontSize: 9 },
    ]
    // Thời gian cần + Kế hoạch sử dụng: ô GỘP toàn bảng (chỉ điền ở dòng đầu)
    if (i === 0) {
      row.push({ text: phieu.thoi_gian_can || '', alignment: 'center', fontSize: 9, rowSpan: soDong, margin: [0, 8, 0, 0] })
      row.push({ text: phieu.ke_hoach_su_dung || '', alignment: 'center', fontSize: 9, rowSpan: soDong, margin: [0, 8, 0, 0] })
    } else {
      row.push({})
      row.push({})
    }
    row.push({ text: d.ghi_chu || '', fontSize: 9 })
    body.push(row)
  })

  const ngay = phieu.created_at ? new Date(phieu.created_at) : new Date()
  const dia = `Hà Nội, ngày ${String(ngay.getDate()).padStart(2, '0')} tháng ${String(ngay.getMonth() + 1).padStart(2, '0')} năm ${ngay.getFullYear()}`
  const deNghi = phieu.tieu_de || `Mua sắm văn phòng phẩm, tài sản, thiết bị tháng ${formatThang(phieu.thang)}`

  const doc: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [40, 36, 40, 40],
    defaultStyle: { font: 'Roboto', fontSize: 11 },
    content: [
      // Tiêu đề (giữa) + hộp mã biểu (phải)
      {
        columns: [
          { width: 118, text: '' },
          {
            width: '*',
            stack: [
              { text: 'ĐỀ XUẤT MUA VĂN PHÒNG PHẨM,', bold: true, alignment: 'center', fontSize: 12 },
              { text: 'TRANG THIẾT BỊ,', bold: true, alignment: 'center', fontSize: 12 },
              { text: 'TÀI SẢN VĂN PHÒNG', bold: true, alignment: 'center', fontSize: 12 },
            ],
          },
          {
            width: 118,
            fontSize: 8,
            stack: [
              { text: 'BM01/QLTS/04-HCNS', alignment: 'center', bold: true },
              { text: 'Ngày ban hành: 01/12/2011' },
              { text: 'Lần sửa đổi: Lần 1' },
            ],
          },
        ],
      },
      { text: 'Kính gửi:      - Ban Giám đốc;', margin: [0, 14, 0, 0] },
      { text: '                    - Phòng Hành chính Nhân sự.' },
      { text: [{ text: 'Người đề nghị: ', bold: true }, phieu.nguoi_de_nghi_ten], margin: [0, 8, 0, 0] },
      { text: [{ text: 'Bộ phận: ', bold: true }, phieu.phong_ban_ten || ''] },
      { text: [{ text: 'Đề nghị: ', bold: true }, deNghi], margin: [0, 0, 0, 10] },
      {
        table: { headerRows: 1, widths: [22, '*', 45, 42, 52, 66, 58], body },
        layout: {
          hLineColor: () => '#555',
          vLineColor: () => '#555',
          hLineWidth: () => 0.7,
          vLineWidth: () => 0.7,
        },
      },
      {
        columns: [
          { width: '*', text: '' },
          { width: 230, text: dia, alignment: 'center', italics: true },
        ],
        margin: [0, 14, 0, 0],
      },
      {
        columns: [
          { text: 'BAN GIÁM ĐỐC', alignment: 'center', bold: true, fontSize: 10 },
          { text: 'PHÒNG HCNS', alignment: 'center', bold: true, fontSize: 10 },
          { text: 'TRƯỞNG BỘ PHẬN', alignment: 'center', bold: true, fontSize: 10 },
          { text: 'NGƯỜI ĐỀ NGHỊ', alignment: 'center', bold: true, fontSize: 10 },
        ],
        margin: [0, 8, 0, 0],
      },
      {
        columns: [
          { text: '', alignment: 'center' },
          { text: '', alignment: 'center' },
          { text: phieu.truong_bo_phan || '', alignment: 'center', margin: [0, 46, 0, 0], fontSize: 10 },
          { text: phieu.nguoi_de_nghi_ten, alignment: 'center', margin: [0, 46, 0, 0], fontSize: 10 },
        ],
      },
    ],
  }

  const pdfDoc = pr.createPdfKitDocument(doc)
  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    pdfDoc.on('data', (c: Buffer) => chunks.push(c))
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)))
    pdfDoc.on('error', reject)
    pdfDoc.end()
  })
}
