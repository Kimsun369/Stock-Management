'use client'

import { Loader2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'

export function TableLoadingCard() {
  const { t } = useI18n()

  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex items-center justify-center gap-3 px-4 py-8 text-zinc-600 dark:text-zinc-300">
      <Loader2 className="h-5 w-5 shrink-0 animate-spin text-amber-600 dark:text-amber-400" />
      <span className="text-sm font-semibold">{t('common.loading')}</span>
    </div>
  )
}
