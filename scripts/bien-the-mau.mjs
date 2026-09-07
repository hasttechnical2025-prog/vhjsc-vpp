// Dò danh sách MÀU trong tên sản phẩm và đổ vào cột bien_the (text[]).
// Quy tắc: lấy cụm trong () ở CUỐI tên; tách theo , ; / hoặc " và ";
// nếu MỌI token đều là màu và có >=2 màu -> đó là hàng nhiều màu (biến thể).
// Mặc định DRY-RUN (chỉ in). Chạy thật: node scripts/bien-the-mau.mjs --apply
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
function loadEnv() {
  const p = path.join(ROOT, '.env.local')
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv()
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !SERVICE) { console.error('❌ Thiếu env Supabase'); process.exit(1) }
const sb = createClient(URL, SERVICE, { auth: { persistSession: false } })
const APPLY = process.argv.includes('--apply')

// Từ khoá màu (không dấu, chữ thường). Token phải KHỚP TRỌN sau khi bỏ dấu.
const MAU_DON = new Set([
  'xanh', 'do', 'den', 'trang', 'vang', 'tim', 'hong', 'cam', 'nau', 'xam',
  'ghi', 'be', 'bac', 'lam', 'luc', 'chi', 'kem', 'reu', 'navy', 'dam',
])
// Cụm 2 chữ hay gặp
const MAU_GHEP = new Set([
  'xanh la', 'xanh duong', 'xanh bien', 'xanh ngoc', 'xanh reu', 'xanh navy',
  'xanh coban', 'xanh chuoi', 'xanh nuoc bien', 'xanh nhat', 'xanh dam',
  'do do', 'do tuoi', 'do dam', 'vang kim', 'vang chanh', 'vang nhat',
  'tim than', 'nau do', 'ghi xam', 'den bong', 'trong suot', 'da cam',
])
const boDau = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim()
function laMau(tok) {
  const k = boDau(tok).replace(/\s+/g, ' ')
  if (MAU_GHEP.has(k)) return true
  if (MAU_DON.has(k)) return true
  // "xanh la cay" -> chứa cụm ghép ở đầu
  for (const g of MAU_GHEP) if (k.startsWith(g)) return true
  return false
}

// Trả về mảng màu (đúng chữ gốc) nếu tên là hàng nhiều màu, ngược lại null.
function tachMau(ten) {
  const m = ten.match(/\(([^()]*)\)\s*$/)
  if (!m) return null
  const raw = m[1].trim()
  if (!raw) return null
  const toks = raw.split(/\s*(?:,|;|\/|\bvà\b|\bva\b)\s*/i).map((t) => t.trim()).filter(Boolean)
  if (toks.length < 2) return null
  if (!toks.every(laMau)) return null
  // Chuẩn hoá hiển thị: viết hoa chữ đầu mỗi token
  return toks.map((t) => t.charAt(0).toUpperCase() + t.slice(1))
}

async function main() {
  const { data, error } = await sb.from('vhjscvpp_san_pham').select('id, ten').order('id')
  if (error) { console.error(error); process.exit(1) }
  const updates = []
  for (const sp of data) {
    const mau = tachMau(sp.ten || '')
    if (mau) updates.push({ id: sp.id, ten: sp.ten, bien_the: mau })
  }
  console.log(`Tổng SP: ${data.length} · Phát hiện nhiều màu: ${updates.length}\n`)
  for (const u of updates) console.log(`  #${u.id}  [${u.bien_the.join(', ')}]  ← ${u.ten}`)
  if (!APPLY) { console.log('\n(DRY-RUN) Thêm --apply để ghi vào DB.'); return }
  let ok = 0
  for (const u of updates) {
    const { error: e } = await sb.from('vhjscvpp_san_pham').update({ bien_the: u.bien_the }).eq('id', u.id)
    if (e) console.error(`  ✗ #${u.id}`, e.message)
    else ok++
  }
  console.log(`\n✅ Đã cập nhật ${ok}/${updates.length} sản phẩm.`)
}
main()
