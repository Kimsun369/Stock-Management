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
    <div className="flex flex-col w-full max-w-[460px] mx-auto card-glass-gold rounded-3xl px-6 py-10 sm:px-12 sm:py-14 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-10 sm:mb-12 fade-up-1">
        <div className="flex items-center justify-center mb-7">
          <img
            src="/images/logo-golden-dragon.png"
            alt="ភោជនីយដ្ឋាននាគមាសសន្តិភាព2"
            className="h-16 sm:h-20 w-auto object-contain drop-shadow-md"
          />
        </div>
        <h2 className="text-2xl sm:text-[28px] font-extrabold font-khmer text-[#1C1917] dark:text-[#F4F1EA] tracking-tight leading-snug">
          {language === 'km' ? 'ចូលប្រើប្រព័ន្ធគ្រប់គ្រងស្តុក' : 'Staff Sign In'}
        </h2>
        <p className="mt-3 max-w-xs text-sm sm:text-base text-[#78716C] dark:text-[#A8A29A] font-medium font-khmer leading-relaxed">
          {language === 'km'
            ? 'ប្រព័ន្ធគ្រប់គ្រងស្តុក និងទំនិញភ្ញៀវផ្ញើ'
            : 'Production Bilingual Stock Management System'}
        </p>
      </div>

      {/* Error banner */}
      {activeError && (
        <div
          role="alert"
          className="mb-8 px-5 py-4 rounded-2xl bg-rose-500/10 dark:bg-rose-950/40 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm font-semibold fade-up-2 shadow-xs"
        >
          <div className="flex items-start gap-3.5">
            <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1 text-left">
              <p className="font-khmer leading-relaxed">{activeError}</p>
              {isAccessDenied && googleOAuthEnabled && (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer font-khmer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t('auth.switchGoogleAccount')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Login form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-7">
        {/* Email */}
        <div className="fade-up-2">
          <label
            htmlFor="staff-email"
            className="block mb-2.5 px-1 text-sm font-bold text-[#1C1917] dark:text-[#F4F1EA] font-khmer leading-relaxed"
          >
            {t('auth.email')}
          </label>
          <input
            {...register('email')}
            id="staff-email"
            type="email"
            autoComplete="email"
            className={`w-full h-14 px-5 text-base leading-normal rounded-2xl bg-white/70 dark:bg-[#111113]/80 border text-[#1C1917] dark:text-[#F4F1EA] outline-none transition-all duration-200 focus:ring-4 focus:ring-[#E8B84A]/20 ${
              errors.email
                ? 'border-rose-400 focus:border-rose-500'
                : 'border-[rgba(201,150,43,0.3)] dark:border-[rgba(232,184,74,0.25)] focus:border-[#E8B84A]'
            }`}
          />
          {errors.email && (
            <p className="mt-2 px-1 text-xs text-rose-500 font-medium leading-relaxed">
              {t('auth.invalidCredentials')}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="fade-up-3">
          <label
            htmlFor="staff-password"
            className="block mb-2.5 px-1 text-sm font-bold text-[#1C1917] dark:text-[#F4F1EA] font-khmer leading-relaxed"
          >
            {t('auth.password')}
          </label>
          <div className="relative">
            <input
              {...register('password')}
              id="staff-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className={`w-full h-14 pl-5 pr-14 text-base leading-normal rounded-2xl bg-white/70 dark:bg-[#111113]/80 border text-[#1C1917] dark:text-[#F4F1EA] outline-none transition-all duration-200 focus:ring-4 focus:ring-[#E8B84A]/20 ${
                errors.password
                  ? 'border-rose-400 focus:border-rose-500'
                  : 'border-[rgba(201,150,43,0.3)] dark:border-[rgba(232,184,74,0.25)] focus:border-[#E8B84A]'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-xl text-[#78716C] dark:text-[#A8A29A] hover:text-[#E8B84A] transition-colors cursor-pointer"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-2 px-1 text-xs text-rose-500 font-medium leading-relaxed">
              {t('auth.invalidCredentials')}
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="pt-3 fade-up-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-gold-primary w-full h-14 rounded-2xl text-sm sm:text-base font-black flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md font-khmer"
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
        <div className="fade-up-5 mt-9">
          <div className="relative mb-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[rgba(201,150,43,0.2)] dark:border-[rgba(232,184,74,0.18)]" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-transparent text-xs text-[#78716C] dark:text-[#A8A29A] font-bold">
                {t('auth.or')}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full h-14 rounded-2xl border border-[rgba(201,150,43,0.3)] dark:border-[rgba(232,184,74,0.25)] bg-white/70 dark:bg-[#111113]/80 hover:bg-white dark:hover:bg-[#18181C] text-sm sm:text-base font-bold text-[#1C1917] dark:text-[#F4F1EA] transition-all flex items-center justify-center gap-3 shadow-2xs cursor-pointer font-khmer"
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

      {/* Footer note */}
      <div className="mt-10 pt-6 border-t border-[rgba(201,150,43,0.2)] dark:border-[rgba(232,184,74,0.18)] fade-up-5">
        <p className="text-center text-xs text-[#78716C] dark:text-[#A8A29A] font-medium font-khmer leading-relaxed">
          ភោជនីយដ្ឋាននាគមាសសន្តិភាព2 • Authorized Staff Access
        </p>
      </div>
    </div>
  )
}