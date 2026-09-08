import { createBrowserClient } from '@supabase/ssr'

// Client phía TRÌNH DUYỆT cho Supabase Auth — chỉ để khởi động đăng nhập Google
// (signInWithOAuth). PKCE verifier lưu ở cookie để route callback đổi code được.
export function supabaseAuthBrowser() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
