// Lấy CHAT ID của nhóm sau khi đã thêm bot vào nhóm.
// Bước làm:
//   1) Tạo bot qua @BotFather, lấy token.
//   2) Thêm bot vào nhóm Admin+HCNS.
//   3) Trong nhóm gõ 1 tin bất kỳ có nhắc bot, VD: "@ten_bot test".
//   4) Đặt token vào .env.local (TELEGRAM_BOT_TOKEN=...) rồi chạy:
//        node scripts/telegram-chatid.mjs
//   -> in ra danh sách chat kèm id. Nhóm có id ÂM (VD -100xxxxxxxxxx).
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
const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) { console.error('❌ Thiếu TELEGRAM_BOT_TOKEN trong .env.local'); process.exit(1) }

const r = await fetch(`https://api.telegram.org/bot${token}/getUpdates`)
const j = await r.json()
if (!j.ok) { console.error('❌ Lỗi:', j.description); process.exit(1) }
const chats = new Map()
for (const u of j.result) {
  const c = u.message?.chat || u.channel_post?.chat || u.my_chat_member?.chat
  if (c) chats.set(c.id, c)
}
if (chats.size === 0) {
  console.log('Chưa thấy chat nào. Hãy gõ 1 tin trong nhóm (có nhắc bot) rồi chạy lại.')
} else {
  console.log('Các chat bot đang thấy:\n')
  for (const c of chats.values())
    console.log(`  id=${c.id}  type=${c.type}  ${c.title || c.username || ''}`)
  console.log('\n→ Lấy id nhóm (thường bắt đầu -100...) đặt vào TELEGRAM_CHAT_ID.')
}
