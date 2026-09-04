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
  thang: string
  tieu_de: string | null
}
type Dong = {
  ten_tay: string | null
  dvt: string | null
  so_luong: number
  thoi_gian_can: string | null
  ke_hoach_su_dung: string | null
  ghi_chu: string | null
  san_pham: { ten: string } | null
}

export async function buildBM01(phieu: Phieu, rows: Dong[]): Promise<Buffer> {
  const pr = await getPrinter()

  const header = ['TT', 'Tên TTB/VPP', 'ĐVT', 'Số lượng', 'Thời gian cần', 'Kế hoạch sử dụng', 'Ghi chú'].map(
    (t) => ({ text: t, bold: true, fillColor: '#eef2f7', alignment: 'center' as const, fontSize: 9 }),
  )
  const body = rows.map((d, i) => [
    { text: String(i + 1), alignment: 'center' as const, fontSize: 9 },
    { text: d.san_pham?.ten || d.ten_tay || '', fontSize: 9 },
    { text: d.dvt || '', alignment: 'center' as const, fontSize: 9 },
    { text: d.so_luong != null ? String(d.so_luong) : '', alignment: 'center' as const, fontSize: 9 },
    { text: d.thoi_gian_can || '', alignment: 'center' as const, fontSize: 9 },
    { text: d.ke_hoach_su_dung || '', fontSize: 9 },
    { text: d.ghi_chu || '', fontSize: 9 },
  ])

  const now = new Date()
  const dia = `Hà Nội, ngày ${String(now.getDate()).padStart(2, '0')} tháng ${String(now.getMonth() + 1).padStart(2, '0')} năm ${now.getFullYear()}`

  const doc: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    content: [
      {
        columns: [
          { text: 'CÔNG TY CỔ PHẦN VHJSC', bold: true, fontSize: 10 },
          { text: 'BM01/QLTS/04-HCNS', alignment: 'right', fontSize: 9 },
        ],
      },
      {
        text: 'ĐỀ XUẤT MUA VĂN PHÒNG PHẨM, TRANG THIẾT BỊ, TÀI SẢN VĂN PHÒNG',
        bold: true,
        alignment: 'center',
        fontSize: 13,
        margin: [0, 14, 0, 4],
      },
      { text: 'Kính gửi:  - Ban Giám đốc;', margin: [0, 8, 0, 0], fontSize: 10 },
      { text: '                - Phòng Hành chính Nhân sự.', fontSize: 10 },
      { text: `Người đề nghị: ${phieu.nguoi_de_nghi_ten}`, margin: [0, 6, 0, 0], fontSize: 10 },
      { text: `Bộ phận: ${phieu.phong_ban_ten || ''}`, fontSize: 10 },
      {
        text: `Đề nghị: ${phieu.tieu_de || `Mua sắm văn phòng phẩm tháng ${formatThang(phieu.thang)}`}`,
        margin: [0, 0, 0, 10],
        fontSize: 10,
      },
      {
        table: {
          headerRows: 1,
          widths: [22, '*', 40, 44, 60, 90, 70],
          body: [header, ...body],
        },
        layout: {
          hLineColor: () => '#999',
          vLineColor: () => '#999',
        },
      },
      { text: dia, alignment: 'right', italics: true, margin: [0, 16, 0, 0], fontSize: 10 },
      {
        columns: [
          { text: 'BAN GIÁM ĐỐC', alignment: 'center', bold: true, fontSize: 10 },
          { text: 'PHÒNG HCNS', alignment: 'center', bold: true, fontSize: 10 },
          { text: 'TRƯỞNG BỘ PHẬN', alignment: 'center', bold: true, fontSize: 10 },
          { text: 'NGƯỜI ĐỀ NGHỊ', alignment: 'center', bold: true, fontSize: 10 },
        ],
        margin: [0, 10, 0, 0],
      },
      {
        columns: [
          { text: '', alignment: 'center' },
          { text: '', alignment: 'center' },
          { text: '', alignment: 'center' },
          { text: phieu.nguoi_de_nghi_ten, alignment: 'center', margin: [0, 40, 0, 0], fontSize: 10 },
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
