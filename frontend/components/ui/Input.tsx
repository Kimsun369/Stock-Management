'use client'

import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 font-khmer">
            {label}
            {props.required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`w-full rounded-lg border bg-white dark:bg-[#18181D] px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:ring-2 focus:ring-amber-400/30 ${
            error
              ? 'border-rose-400 focus:border-rose-500 dark:border-rose-500'
              : 'border-zinc-300 dark:border-zinc-700/80 focus:border-amber-500'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{helperText}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
