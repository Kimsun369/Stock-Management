import { redirect } from 'next/navigation'

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const error = params?.error ? `?error=${encodeURIComponent(String(params.error))}` : ''
  redirect(`/${error}`)
}
