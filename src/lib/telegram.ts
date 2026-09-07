// Gửi thông báo Telegram vào 1 nhóm chat chung (Admin + HCNS).
// Cần 2 biến môi trường: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.
// Nếu thiếu env -> không làm gì (app vẫn chạy bình thường).

export function telegramDaBat(): boolean {
  return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
}

// Escape ký tự đặc biệt của parse_mode HTML.
export function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function guiTelegram(html: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return false
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })
    return r.ok
  } catch {
    return false
  }
}
