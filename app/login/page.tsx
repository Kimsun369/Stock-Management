import { redirect } from 'next/navigation'

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const error = params?.error ? String(params.error) : null

  // In production we keep the original redirect behaviour (to the home page).
  // In development we display the raw error code for easier debugging.
  if (process.env.NODE_ENV !== 'production') {
    if (error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
          <div className="rounded border border-red-400 bg-white p-6 text-center">
            <h1 className="mb-4 text-xl font-bold text-red-600">Google Sign‑In Error</h1>
            <p className="text-gray-800">{error}</p>
            <p className="mt-2 text-sm text-gray-500">(Development only – production will redirect)</p>
          </div>
        </div>
      )
    }
    // No error – fall back to the normal app entry point.
    redirect('/')
    return null // unreachable but satisfies TypeScript
  }

  // Production – keep legacy behaviour.
  const query = error ? `?error=${encodeURIComponent(error)}` : ''
  redirect(`/${query}`)
  return null
}
