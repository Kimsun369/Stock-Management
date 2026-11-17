'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'warning'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [
      // Keep one visible notification per type so repeated failed submits cannot stack.
      ...prev.filter((toast) => toast.type !== type),
      { id, type, message },
    ].slice(-3))
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 7000)
  }, [])

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id))

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[9999] flex w-[calc(100%-2rem)] max-w-lg flex-col gap-3 pointer-events-none sm:top-6 sm:right-6 sm:w-full"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  const icons: Record<ToastType, React.ReactNode> = {
    success: (
      <span className="rounded-full bg-white/20 p-2 text-white shrink-0">
        <CheckCircle2 size={22} strokeWidth={3} />
      </span>
    ),
    error: (
      <span className="rounded-full bg-white/20 p-2 text-white shrink-0">
        <XCircle size={22} strokeWidth={3} />
      </span>
    ),
    warning: (
      <span className="rounded-full bg-black/10 p-2 text-zinc-950 shrink-0">
        <AlertCircle size={22} strokeWidth={3} />
      </span>
    ),
  }

  const bgClasses: Record<ToastType, string> = {
    success:
      'border-emerald-500 bg-emerald-700 text-white shadow-2xl shadow-emerald-950/35 ring-2 ring-emerald-200 dark:border-emerald-400 dark:bg-emerald-800 dark:ring-emerald-950',
    error:
      'border-rose-500 bg-rose-700 text-white shadow-2xl shadow-rose-950/35 ring-2 ring-rose-200 dark:border-rose-400 dark:bg-rose-800 dark:ring-rose-950',
    warning:
      'border-amber-500 bg-amber-500 text-zinc-950 shadow-2xl shadow-amber-950/30 ring-2 ring-amber-200 dark:border-amber-300 dark:bg-amber-400 dark:ring-amber-950',
  }

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex min-h-[76px] items-center gap-4 rounded-2xl border-2 px-5 py-4 transition-all duration-300 ease-out sm:px-6',
        bgClasses[toast.type],
        visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95'
      )}
    >
      {icons[toast.type]}
      <span className="flex-1 text-base font-extrabold leading-snug sm:text-lg">{toast.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded-lg bg-black/10 p-2 text-white hover:bg-black/20 transition-colors"
        aria-label="Close notification"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
