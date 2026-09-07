import { getCauHinh } from '@/lib/config'
import LoginForm from '@/components/LoginForm'

export default async function LoginPage() {
  const cauHinh = await getCauHinh()
  return <LoginForm logoUrl={cauHinh.logo_url} brandText={cauHinh.brand_text} />
}
