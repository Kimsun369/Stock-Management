import { AlertCircle } from 'lucide-react'
import type { ReactNode } from 'react'

export function ErrorNotice({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div role="alert" aria-live="assertive" className={`flex w-full min-w-0 items-start gap-3 rounded-2xl border-2 border-rose-400 bg-rose-50 px-5 py-4 text-rose-950 shadow-lg shadow-rose-900/10 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-100 sm:px-6 ${className}`}>
      <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-rose-600 dark:text-rose-400" />
      <span className="min-w-0 break-words text-sm font-bold leading-relaxed sm:text-base">{children}</span>
    </div>
  )
}
