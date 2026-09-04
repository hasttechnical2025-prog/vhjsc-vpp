// Seed 1 lần: tạo bucket ảnh + upload 451 ảnh, import 634 sản phẩm,
// tạo phòng ban "Kinh doanh" và tài khoản admin.
// Chạy: npm run seed   (tự đọc .env.local)
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// --- đọc .env.local thủ công (không cần dotenv) ---
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
if (!URL || !SERVICE || SERVICE.startsWith('dan-')) {
  console.error('❌ Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local')
  process.exit(1)
}
const sb = createClient(URL, SERVICE, { auth: { persistSession: false } })
const BUCKET = 'vpp-images'

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex')
  return `scrypt:${salt}:${hash}`
}

// --- CSV parser tối giản (RFC4180: field có dấu phẩy/nháy trong ngoặc kép) ---
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  const rows = []
  let row = [], field = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++ } else q = false }
      else field += c
    } else {
      if (c === '"') q = true
      else if (c === ',') { row.push(field); field = '' }
      else if (c === '\r') {}
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
      else field += c
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows
}

async function ensureBucket() {
  const { data } = await sb.storage.getBucket(BUCKET)
  if (!data) {
    const { error } = await sb.storage.createBucket(BUCKET, { public: true })
    if (error) throw error
    console.log('✅ Tạo bucket', BUCKET)
  } else console.log('• Bucket', BUCKET, 'đã có')
}

async function uploadImages() {
  const dir = path.join(ROOT, 'seed-data', 'images')
  if (!fs.existsSync(dir)) { console.log('• Không thấy thư mục ảnh, bỏ qua upload'); return {} }
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.webp'))
  const map = {}
  let done = 0
  for (const f of files) {
    const buf = fs.readFileSync(path.join(dir, f))
    const { error } = await sb.storage.from(BUCKET).upload(f, buf, {
      contentType: 'image/webp', upsert: true,
    })
    if (error) { console.warn('  ⚠ lỗi upload', f, error.message); continue }
    map[f] = sb.storage.from(BUCKET).getPublicUrl(f).data.publicUrl
    if (++done % 50 === 0) console.log('  ...', done, '/', files.length)
  }
  console.log('✅ Upload ảnh:', done, '/', files.length)
  return map
}

async function importProducts(imgMap) {
  const csv = fs.readFileSync(path.join(ROOT, 'seed-data', 'vpp_san_pham.csv'), 'utf8')
  const rows = parseCSV(csv)
  const header = rows[0]
  const col = Object.fromEntries(header.map((h, i) => [h.trim(), i]))
  const recs = []
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    if (!row || !row[col.id]) continue
    const anh = row[col.anh]
    recs.push({
      id: Number(row[col.id]),
      nhom_hang: row[col.nhom_hang],
      ten: row[col.ten],
      xuat_xu: row[col.xuat_xu] || null,
      quy_cach: row[col.quy_cach] || null,
      dvt: row[col.dvt] || null,
      don_gia: row[col.don_gia] ? Number(row[col.don_gia]) : null,
      anh_url: anh && imgMap[anh] ? imgMap[anh] : null,
    })
  }
  // upsert theo lô 500
  for (let i = 0; i < recs.length; i += 500) {
    const chunk = recs.slice(i, i + 500)
    const { error } = await sb.from('vpp_san_pham').upsert(chunk, { onConflict: 'id' })
    if (error) throw error
  }
  console.log('✅ Import sản phẩm:', recs.length)
}

async function ensureSeedAccounts() {
  // Phòng ban Kinh doanh
  let { data: pb } = await sb.from('vpp_phong_ban').select('id').eq('ten', 'Phòng kinh doanh').maybeSingle()
  if (!pb) {
    const { data, error } = await sb.from('vpp_phong_ban')
      .insert({ ten: 'Phòng kinh doanh', ma: 'PKD' }).select('id').single()
    if (error) throw error
    pb = data
    console.log('✅ Tạo phòng ban: Phòng kinh doanh')
  } else console.log('• Phòng ban Phòng kinh doanh đã có')

  // Tài khoản admin
  const { data: admin } = await sb.from('vpp_nguoi_dung').select('id').eq('username', 'admin').maybeSingle()
  if (!admin) {
    const pw = process.env.SEED_ADMIN_PASSWORD || 'admin123'
    const { error } = await sb.from('vpp_nguoi_dung').insert({
      ho_ten: 'Quản trị', username: 'admin', password_hash: hashPassword(pw),
      role: 'admin', phong_ban_id: null, is_active: true,
    })
    if (error) throw error
    console.log(`✅ Tạo admin (username: admin / mật khẩu: ${pw}) — ĐỔI NGAY sau khi đăng nhập`)
  } else console.log('• Tài khoản admin đã có')

  // 1 tài khoản người đề nghị mẫu cho PKD
  const { data: u } = await sb.from('vpp_nguoi_dung').select('id').eq('username', 'pkd').maybeSingle()
  if (!u) {
    const { error } = await sb.from('vpp_nguoi_dung').insert({
      ho_ten: 'Nguyễn Hà Thu', username: 'pkd', password_hash: hashPassword('pkd123'),
      role: 'nguoi_de_nghi', phong_ban_id: pb.id, is_active: true,
    })
    if (error) throw error
    console.log('✅ Tạo user mẫu PKD (username: pkd / mật khẩu: pkd123)')
  }
}

;(async () => {
  console.log('== SEED VHJSC VPP ==')
  await ensureBucket()
  const imgMap = await uploadImages()
  await importProducts(imgMap)
  await ensureSeedAccounts()
  console.log('🎉 Xong.')
})().catch(e => { console.error(e); process.exit(1) })
