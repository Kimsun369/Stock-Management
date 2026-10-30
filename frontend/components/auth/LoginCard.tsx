'use client'

import React, { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Eye, EyeOff, ArrowRight, ShieldAlert, RefreshCw } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
type FormData = z.infer<typeof schema>

const ERROR_MAP: Record<string, string> = {
  INVALID_CREDENTIALS: 'auth.invalidCredentials',
  INVALID_INPUT: 'auth.invalidCredentials',
  ACCOUNT_INACTIVE: 'auth.accountInactive',
  OAuthAccountNotLinked: 'auth.invalidCredentials',
  AccessDenied: 'auth.accessDenied',
  OAuthSignin: 'auth.oauthError',
  OAuthCallback: 'auth.oauthError',
  OAuthCreateAccount: 'auth.oauthError',
  Default: 'common.error',
}

export function LoginCard() {
  const { t, language } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlError = searchParams.get('error')

  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const googleOAuthEnabled = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === 'true'

  // Determine active error message (URL OAuth error or direct form error)
  const activeError = serverError || (urlError ? t(ERROR_MAP[urlError] ?? ERROR_MAP.Default) : null)
  const isAccessDenied = urlError === 'AccessDenied'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    setServerError(null)

    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    })

    setIsSubmitting(false)

    if (result?.error) {
      const key = ERROR_MAP[result.error] ?? ERROR_MAP.Default
      setServerError(t(key))
    } else {
      router.replace('/dashboard')
    }
  }

  const handleGoogleSignIn = () => {
    signIn('google', {
      callbackUrl: '/dashboard',
      prompt: 'select_account',
    })
  }

  return (
    <div className="w-full max-w-[440px] card-glass-gold p-7 sm:p-10 shadow-2xl relative">
      {/* 1. Header with Authentic Official Business Logo (No AI star icons) */}
      <div className="text-center mb-7 fade-up-1">
        <div className="flex items-center justify-center mb-3">
          <img
            src="/images/logo-golden-dragon.png"
            alt="ភោជនីយដ្ឋាននាគមាសសន្តិភាព2"
            className="h-14 sm:h-16 w-auto object-contain drop-shadow-md"
          />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold font-khmer text-[#1C1917] dark:text-[#F4F1EA] tracking-tight leading-snug">
          {language === 'km' ? 'ចូលប្រើប្រព័ន្ធគ្រប់គ្រងស្តុក' : 'Staff Sign In'}
        </h2>
        <p className="text-sm sm:text-base text-[#78716C] dark:text-[#A8A29A] mt-1.5 font-medium font-khmer leading-relaxed">
          {language === 'km'
            ? 'ប្រព័ន្ធគ្រប់គ្រងស្តុក និងទំនិញភ្ញៀវផ្ញើ'
            : 'Production Bilingual Stock Management System'}
        </p>
      </div>

      {/* Friendly, Non-IT Explanatory Error Banner */}
      {activeError && (
        <div
          role="alert"
          className="mb-5 p-4 rounded-xl bg-rose-500/10 dark:bg-rose-950/40 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm font-semibold fade-up-2 shadow-xs"
        >
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1 text-left">
              <p className="font-khmer leading-relaxed">{activeError}</p>
              {isAccessDenied && googleOAuthEnabled && (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer font-khmer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t('auth.switchGoogleAccount')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Login Form with Generous, Highly Legible Floating Label Inputs */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {/* Email Field with Floating Label */}
        <div className="relative fade-up-2">
          <div className="relative">
            <input
              {...register('email')}
              id="staff-email"
              type="email"
              autoComplete="email"
              placeholder=" "
              className={`floating-input peer w-full h-13 px-4 pt-4 text-sm sm:text-base rounded-xl bg-white/70 dark:bg-[#111113]/80 border text-[#1C1917] dark:text-[#F4F1EA] outline-none transition-all duration-200 placeholder-transparent focus:ring-2 focus:ring-[#E8B84A]/30 ${
                errors.email
                  ? 'border-rose-400 focus:border-rose-500'
                  : 'border-[rgba(201,150,43,0.3)] dark:border-[rgba(232,184,74,0.25)] focus:border-[#E8B84A]'
              }`}
            />
            <label
              htmlFor="staff-email"
              className="floating-label absolute left-4 top-4 text-sm text-[#78716C] dark:text-[#A8A29A] font-semibold pointer-events-none transition-all duration-200 font-khmer"
            >
              {t('auth.email')}
            </label>
          </div>
          {errors.email && (
            <p className="mt-1 text-xs text-rose-500 font-medium">{t('auth.invalidCredentials')}</p>
          )}
        </div>

        {/* Password Field with Floating Label & Show/Hide Toggle */}
        <div className="relative fade-up-3">
          <div className="relative">
            <input
              {...register('password')}
              id="staff-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder=" "
              className={`floating-input peer w-full h-13 px-4 pr-12 pt-4 text-sm sm:text-base rounded-xl bg-white/70 dark:bg-[#111113]/80 border text-[#1C1917] dark:text-[#F4F1EA] outline-none transition-all duration-200 placeholder-transparent focus:ring-2 focus:ring-[#E8B84A]/30 ${
                errors.password
                  ? 'border-rose-400 focus:border-rose-500'
                  : 'border-[rgba(201,150,43,0.3)] dark:border-[rgba(232,184,74,0.25)] focus:border-[#E8B84A]'
              }`}
            />
            <label
              htmlFor="staff-password"
              className="floating-label absolute left-4 top-4 text-sm text-[#78716C] dark:text-[#A8A29A] font-semibold pointer-events-none transition-all duration-200 font-khmer"
            >
              {t('auth.password')}
            </label>
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#78716C] dark:text-[#A8A29A] hover:text-[#E8B84A] transition-colors p-1 cursor-pointer"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-rose-500 font-medium">{t('auth.invalidCredentials')}</p>
          )}
        </div>

        {/* Primary Submit Button with Shimmer & High Contrast */}
        <div className="pt-2 fade-up-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-gold-primary w-full h-13 rounded-xl text-sm sm:text-base font-black flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md font-khmer"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#0A0A0B]" />
            ) : (
              <>
                <span>{t('auth.signInButton')}</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Google OAuth (if enabled) */}
      {googleOAuthEnabled && (
        <div className="fade-up-5 mt-6">
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[rgba(201,150,43,0.2)] dark:border-[rgba(232,184,74,0.18)]" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-transparent text-xs text-[#78716C] dark:text-[#A8A29A] font-bold">
                {t('auth.or')}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full h-12 rounded-xl border border-[rgba(201,150,43,0.3)] dark:border-[rgba(232,184,74,0.25)] bg-white/70 dark:bg-[#111113]/80 hover:bg-white dark:hover:bg-[#18181C] text-sm font-bold text-[#1C1917] dark:text-[#F4F1EA] transition-all flex items-center justify-center gap-2.5 shadow-2xs cursor-pointer font-khmer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span>{t('auth.signInWithGoogle')}</span>
          </button>
        </div>
      )}

      {/* Subtle Bottom Note */}
      <p className="mt-6 text-center text-xs text-[#78716C] dark:text-[#A8A29A] font-medium font-khmer fade-up-5 leading-relaxed">
        ភោជនីយដ្ឋាននាគមាសសន្តិភាព2 • Authorized Staff Access
      </p>
    </div>
  )
}
