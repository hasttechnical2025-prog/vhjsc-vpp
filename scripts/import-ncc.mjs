// Import 43 nhà cung cấp từ file "Danh mục phân loại CP_HCNS.xlsx" (sheet "Chi tiết CP").
// Mặc định DRY-RUN. Ghi thật: node scripts/import-ncc.mjs --apply
// Đường dẫn file có thể truyền: node scripts/import-ncc.mjs --apply "C:/duong/dan.xlsx"
import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
function loadEnv() {
  const p = path.join(ROOT, '.env.local')
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv()

const APPLY = process.argv.includes('--apply')
const FILE = process.argv.find((a) => a.endsWith('.xlsx')) || 'C:/Users/anonymous/Desktop/Danh mục phân loại CP_HCNS.xlsx'
const clean = (v) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim()
const hoaDon = (v) => {
  const s = clean(v).toLowerCase()
  if (!s) return null
  if (s.includes('không')) return 'khong'
  if (s.includes('có')) return 'co'
  return null
}

const wb = XLSX.readFile(FILE)
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Chi tiết CP'], { header: 1, defval: '' })
const data = rows.slice(4)
let nhomCur = ''
const recs = []
for (const r of data) {
  const nhom = clean(r[0]) || nhomCur
  if (clean(r[0])) nhomCur = clean(r[0])
  const ten = clean(r[2])
  if (!ten) continue
  recs.push({
    ten,
    dia_chi: clean(r[3]) || null,
    so_dien_thoai: clean(r[4]) || null,
    email: clean(r[5]) || null,
    nhom_chi_phi: nhom || null,
    loai_chi_phi: clean(r[1]) || null,
    co_hoa_don: hoaDon(r[6]),
    tan_suat_thanh_toan: clean(r[7]) || null,
    ngay_den_han: clean(r[8]) || null,
    hop_dong_mo_ta: clean(r[9]) || null,
    trang_thai: 'dang_dung',
  })
}

console.log(`File: ${FILE}`)
console.log(`Phát hiện ${recs.length} nhà cung cấp có tên.\n`)
recs.forEach((r, i) => console.log(`  ${i + 1}. [${r.nhom_chi_phi}] ${r.ten}  — ${r.loai_chi_phi}`))

if (!APPLY) { console.log('\n(DRY-RUN) Thêm --apply để ghi vào DB.'); process.exit(0) }

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})
// Tránh nhân đôi nếu chạy lại: bỏ qua nếu bảng đã có dữ liệu.
const { count } = await sb.from('vhjscvpp_ncc').select('id', { count: 'exact', head: true })
if (count && count > 0) {
  console.log(`\n⚠️ Bảng vhjscvpp_ncc đã có ${count} dòng — bỏ qua để tránh nhân đôi. Xoá trước nếu muốn import lại.`)
  process.exit(0)
}
const { error } = await sb.from('vhjscvpp_ncc').insert(recs)
if (error) { console.error('❌', error.message); process.exit(1) }
console.log(`\n✅ Đã import ${recs.length} nhà cung cấp.`)
