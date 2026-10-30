'use client'

import React, { useEffect, useRef } from 'react'
import { Crown, Volume2, ShieldCheck } from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'

interface BrandPanelProps {
  activeSuite: 'gold' | 'ruby'
  onSelectSuite: (suite: 'gold' | 'ruby') => void
}

export function BrandPanel({ activeSuite, onSelectSuite }: BrandPanelProps) {
  const { language } = useI18n()
  const isKm = language === 'km'
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Subtle floating gold dust particle animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = canvas.offsetWidth)
    let height = (canvas.height = canvas.offsetHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = canvas.offsetWidth
      height = canvas.height = canvas.offsetHeight
    }
    window.addEventListener('resize', handleResize)

    // 25 subtle gold dust particles
    const particles = Array.from({ length: 24 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.8 + 0.6,
      speedY: Math.random() * 0.25 + 0.08,
      speedX: (Math.random() - 0.5) * 0.15,
      opacity: Math.random() * 0.5 + 0.2,
      fadeSpeed: Math.random() * 0.008 + 0.004,
      growing: Math.random() > 0.5,
    }))

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      particles.forEach((p) => {
        p.y -= p.speedY
        p.x += p.speedX

        if (p.growing) {
          p.opacity += p.fadeSpeed
          if (p.opacity >= 0.7) p.growing = false
        } else {
          p.opacity -= p.fadeSpeed
          if (p.opacity <= 0.15) p.growing = true
        }

        if (p.y < 0) p.y = height + 5
        if (p.x < 0) p.x = width
        if (p.x > width) p.x = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(245, 215, 142, ${p.opacity})`
        ctx.shadowColor = '#E8B84A'
        ctx.shadowBlur = 6
        ctx.fill()
      })

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0A0A0B] flex flex-col justify-between p-8 xl:p-12 select-none">
      {/* 1. Background Photos with Ken Burns Zoom & Crossfade */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Imperial Gold Suite Photo */}
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            activeSuite === 'gold' ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src="/images/karaoke-vip-gold.jpg"
            alt="Imperial Gold VIP Hall"
            className="w-full h-full object-cover animate-ken-burns filter brightness-95"
          />
        </div>

        {/* Royal Ruby Chamber Photo */}
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            activeSuite === 'ruby' ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src="/images/karaoke-vip-ruby.jpg"
            alt="Royal Ruby VIP Chamber"
            className="w-full h-full object-cover animate-ken-burns filter brightness-95"
          />
        </div>

        {/* Dark Vignette & Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B]/55 to-black/35" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0B]/85 via-transparent to-[#0A0A0B]/40" />

        {/* Film-grain texture */}
        <div className="absolute inset-0 film-grain pointer-events-none opacity-40 mix-blend-overlay" />

        {/* Canvas for floating gold dust particles */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-1" />
      </div>

      {/* 2. Top Bar: Official Logo & Suite Switcher Pill */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/images/logo-golden-dragon.png"
            alt="ភោជនីយដ្ឋាននាគមាសសន្តិភាព2"
            className="h-13 w-auto object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
          />
        </div>

        {/* Suite Switcher Pill */}
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-[#111113]/85 backdrop-blur-md border border-[rgba(232,184,74,0.25)] shadow-lg">
          <button
            type="button"
            onClick={() => onSelectSuite('gold')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-tight transition-all duration-300 ${
              activeSuite === 'gold'
                ? 'bg-gradient-to-r from-[#F5D78E] via-[#E8B84A] to-[#C9962B] text-[#0A0A0B] shadow-[0_2px_8px_rgba(232,184,74,0.4)]'
                : 'text-[#A8A29A] hover:text-[#F4F1EA] hover:bg-white/5'
            }`}
          >
            Imperial Gold
          </button>
          <button
            type="button"
            onClick={() => onSelectSuite('ruby')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-tight transition-all duration-300 ${
              activeSuite === 'ruby'
                ? 'bg-gradient-to-r from-rose-400 via-rose-500 to-rose-600 text-white shadow-[0_2px_8px_rgba(225,29,72,0.4)]'
                : 'text-[#A8A29A] hover:text-[#F4F1EA] hover:bg-white/5'
            }`}
          >
            Royal Ruby
          </button>
        </div>
      </div>

      {/* 3. Center: Brand Identity & Headlines */}
      <div className="relative z-10 max-w-xl space-y-6 my-auto pt-6">
        {/* Subtle pill badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[rgba(232,184,74,0.12)] border border-[rgba(232,184,74,0.3)] text-[#F5D78E] text-xs font-semibold backdrop-blur-md">
          <Crown className="w-3.5 h-3.5 text-[#E8B84A]" />
          <span>Karaoke & Dining Hospitality</span>
        </div>

        {/* Business Names */}
        <div className="space-y-2">
          <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-extrabold font-khmer text-[#F4F1EA] leading-[1.3] tracking-tight drop-shadow-md">
            ភោជនីយដ្ឋាននាគមាសសន្តិភាព2
          </h1>
          <p className="text-lg xl:text-xl font-serif-luxury italic text-[#F5D78E] tracking-wide">
            Golden Dragon Peace 2 Karaoke & Restaurant
          </p>
        </div>

        <p className="text-sm xl:text-base text-[#A8A29A] leading-relaxed max-w-lg font-normal">
          {isKm
            ? 'ប្រព័ន្ធគ្រប់គ្រងស្តុក និងទំនិញភ្ញៀវផ្ញើកម្រិតស្ដង់ដារ VIP បំពាក់បច្ចេកវិទ្យាបំប្លែងឯកតាស្វ័យប្រវត្តិនឹងការកត់ត្រាទិន្នន័យជាក់ស្តែង។'
            : 'Next-generation luxury stock operations, customer bottle safekeeping, and real-time inventory management for Phnom Penh.'}
        </p>

        {/* Three Slim Stat Items Separated by Thin Gold Hairlines */}
        <div className="pt-5 grid grid-cols-3 gap-5 border-t border-[rgba(232,184,74,0.22)]">
          <div>
            <div className="text-2xl xl:text-3xl font-black text-[#F5D78E] tracking-tight">100%</div>
            <div className="text-xs xl:text-sm text-[#A8A29A] font-semibold mt-1 font-khmer">
              {isKm ? 'ឯកជនភាព VIP' : 'VIP Privacy'}
            </div>
          </div>

          <div className="border-l border-[rgba(232,184,74,0.22)] pl-5">
            <div className="text-2xl xl:text-3xl font-black text-[#F5D78E] tracking-tight">Hi-Fi</div>
            <div className="text-xs xl:text-sm text-[#A8A29A] font-semibold mt-1 font-khmer">
              {isKm ? 'សំឡេងស្ទូឌីយោ' : 'Studio Acoustics'}
            </div>
          </div>

          <div className="border-l border-[rgba(232,184,74,0.22)] pl-5">
            <div className="text-2xl xl:text-3xl font-black text-[#F5D78E] tracking-tight">Real-Time</div>
            <div className="text-xs xl:text-sm text-[#A8A29A] font-semibold mt-1 font-khmer">
              {isKm ? 'គ្រប់គ្រងស្តុក' : 'Stock Control'}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Footer: Copyright & Version */}
      <div className="relative z-10 flex items-center justify-between text-xs text-[#A8A29A] pt-4 border-t border-[rgba(232,184,74,0.18)]">
        <span className="font-khmer">
          &copy; {new Date().getFullYear()} ភោជនីយដ្ឋាននាគមាសសន្តិភាព2
        </span>
        <span className="text-[#E8B84A] font-bold tracking-wider text-[11px]">v2.0 Gold</span>
      </div>
    </div>
  )
}

