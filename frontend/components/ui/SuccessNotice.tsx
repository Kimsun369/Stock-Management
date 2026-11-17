import { CheckCircle2 } from 'lucide-react'
import type { ReactNode } from 'react'

export function SuccessNotice({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`flex w-full min-w-0 items-start gap-3 rounded-2xl border-2 border-emerald-400 bg-emerald-50 px-5 py-4 text-emerald-950 shadow-lg shadow-emerald-900/10 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100 sm:px-6 ${className}`}>
      <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <span className="min-w-0 break-words text-sm font-bold leading-relaxed sm:text-base">{children}</span>
    </div>
  )
}
