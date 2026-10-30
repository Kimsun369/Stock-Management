'use client'

import React, { useState } from 'react'
import { BrandPanel } from '@/frontend/components/auth/BrandPanel'
import { LoginCard } from '@/frontend/components/auth/LoginCard'
import { LanguageSwitch } from '@/frontend/components/auth/LanguageSwitch'
import { ThemeToggle } from '@/frontend/components/auth/ThemeToggle'

export default function UnifiedAuthPage() {
  const [activeSuite, setActiveSuite] = useState<'gold' | 'ruby'>('gold')

  return (
    <main className="h-screen w-screen overflow-hidden flex flex-col lg:flex-row relative bg-[#FAF7F0] dark:bg-[#0A0A0B] text-[#1C1917] dark:text-[#F4F1EA] transition-colors duration-200">
      {/* =========================================================
          LEFT 55% BRAND PANEL (Desktop 1440px and up, visible lg+)
         ========================================================= */}
      <div className="hidden lg:block lg:w-[55%] h-full relative">
        <BrandPanel
          activeSuite={activeSuite}
          onSelectSuite={setActiveSuite}
        />
      </div>

      {/* =========================================================
          RIGHT 45% LOGIN PANEL (Full screen on mobile/tablet)
         ========================================================= */}
      <div className="relative w-full lg:w-[45%] h-full flex flex-col justify-between p-6 sm:p-10 z-10 overflow-y-auto lg:overflow-hidden">
        {/* Mobile Background: Dimmed full-screen photo of active VIP suite */}
        <div className="absolute inset-0 z-0 lg:hidden overflow-hidden pointer-events-none">
          <img
            src={activeSuite === 'gold' ? '/images/karaoke-vip-gold.jpg' : '/images/karaoke-vip-ruby.jpg'}
            alt="Venue Backdrop"
            className="w-full h-full object-cover filter brightness-[0.25] dark:brightness-[0.18] blur-[2px]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#FAF7F0]/90 via-[#FAF7F0]/95 to-[#FAF7F0] dark:from-[#0A0A0B]/85 dark:via-[#0A0A0B]/95 dark:to-[#0A0A0B]" />
        </div>

        {/* Soft Radial Gold Glow behind the form in Right Panel */}
        <div
          className="absolute inset-0 z-0 pointer-events-none opacity-80 dark:opacity-100"
          style={{
            background:
              'radial-gradient(circle 380px at 50% 50%, rgba(232, 184, 74, 0.12) 0%, rgba(232, 184, 74, 0.03) 45%, transparent 70%)',
          }}
        />

        {/* Top Header: Mobile Brand Logo + Top-Right Language & Theme Switchers */}
        <header className="relative z-20 flex items-center justify-between w-full">
          {/* Mobile Logo Branding */}
          <div className="lg:hidden flex items-center gap-2">
            <img
              src="/images/logo-golden-dragon.png"
              alt="ភោជនីយដ្ឋាននាគមាសសន្តិភាព2"
              className="h-10 w-auto object-contain"
            />
          </div>

          <div className="hidden lg:block" />

          {/* Controls: LanguageSwitch + ThemeToggle */}
          <div className="flex items-center gap-2.5 ml-auto">
            <LanguageSwitch />
            <ThemeToggle />
          </div>
        </header>

        {/* Center: Glassmorphism Login Card */}
        <div className="relative z-20 flex-1 flex items-center justify-center py-6 sm:py-8">
          <React.Suspense fallback={<div className="w-full max-w-[440px] h-[480px] rounded-2xl animate-pulse bg-white/20" />}>
            <LoginCard />
          </React.Suspense>
        </div>

        {/* Mobile Bottom Footer */}
        <footer className="relative z-20 lg:hidden text-center text-[10px] text-[#78716C] dark:text-[#A8A29A] font-khmer pb-1">
          ភោជនីយដ្ឋាននាគមាសសន្តិភាព2 • v2.0 Gold
        </footer>
      </div>
    </main>
  )
}
