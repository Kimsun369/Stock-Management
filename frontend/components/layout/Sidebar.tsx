'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Boxes,
  Package,
  Tags,
  ArrowDownToLine,
  ArrowUpFromLine,
  Undo2,
  Clock,
  Receipt,
  BarChart3,
  FileCheck,
  Users,
  History,
  Settings,
  X,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n-context'

interface SidebarProps {
  userRole?: 'ADMIN' | 'STAFF'
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ userRole = 'STAFF', isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { t, language } = useI18n()

  const navItems = [
    { href: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { href: '/dashboard/inventory', label: t('nav.inventory'), icon: Boxes },
    { href: '/dashboard/products', label: t('nav.products'), icon: Package },
    { href: '/dashboard/categories', label: t('nav.categories'), icon: Tags },
    { href: '/dashboard/stock-in', label: t('nav.stockIn'), icon: ArrowDownToLine },
    { href: '/dashboard/stock-out', label: t('nav.stockOut'), icon: ArrowUpFromLine },
    { href: '/dashboard/returned-items', label: t('nav.returnedItems'), icon: Undo2 },
    { href: '/dashboard/customer-leftovers', label: t('nav.customerLeftovers'), icon: Clock },
    { href: '/dashboard/purchase-costs', label: t('nav.purchaseCosts'), icon: Receipt },
    { href: '/dashboard/reports', label: t('nav.reports'), icon: BarChart3 },
    { href: '/dashboard/adjustments', label: t('nav.adjustments'), icon: FileCheck },
  ]

  const adminItems = [
    { href: '/dashboard/staff', label: t('nav.staff'), icon: Users },
    { href: '/dashboard/audit-logs', label: t('nav.auditLogs'), icon: History },
    { href: '/dashboard/settings', label: t('nav.settings'), icon: Settings },
  ]

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar container - Dual Theme: Pure White in Light, Obsidian Charcoal in Dark */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white dark:bg-[#0D0D11] text-zinc-900 dark:text-zinc-100 border-r border-zinc-200 dark:border-zinc-800/80 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header with authentic horizontal rectangular logo */}
        <div className="px-5 pt-5 pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="block w-full">
              {/* Horizontal Logo Container with natural aspect ratio */}
              <div className="relative w-full h-14 flex items-center justify-start overflow-hidden">
                <img
                  src="/images/logo-golden-dragon.png"
                  alt="ភោជនីយដ្ឋាននាគមាសសន្តិភាព2"
                  className="h-full w-auto max-w-[210px] object-contain drop-shadow-xs"
                />
              </div>
              {/* Official Business Name Preserved Exactly */}
              <div className="mt-1.5">
                <h1 className="text-sm font-extrabold text-amber-600 dark:text-amber-400 tracking-tight font-khmer truncate">
                  ភោជនីយដ្ឋាននាគមាសសន្តិភាព2
                </h1>
                <p className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-bold mt-0.5">
                  Karaoke Management
                </p>
              </div>
            </Link>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 lg:hidden transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1.5">
          <div className="px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-khmer">
            {t('nav.dashboard')}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`group flex items-center gap-3.5 px-3.5 py-2.5 text-sm font-bold font-khmer rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'bg-amber-400/15 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400 border-l-4 border-amber-500 font-extrabold shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60'
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 transition-colors ${
                    isActive
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-200'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}

          {userRole === 'ADMIN' && (
            <>
              <div className="pt-5 pb-1.5 px-3 text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-khmer">
                {language === 'km' ? 'ការគ្រប់គ្រងប្រព័ន្ធ' : 'Administration'}
              </div>
              {adminItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`group flex items-center gap-3.5 px-3.5 py-2.5 text-sm font-bold font-khmer rounded-xl transition-all duration-150 ${
                      isActive
                        ? 'bg-amber-400/15 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400 border-l-4 border-amber-500 font-extrabold shadow-2xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 shrink-0 transition-colors ${
                        isActive
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-200'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                )
              })}
            </>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800/80 text-xs text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
          <span className="font-semibold truncate font-khmer">ភោជនីយដ្ឋាននាគមាស</span>
          <span className="font-extrabold text-amber-600 dark:text-amber-400">v2.0 Gold</span>
        </div>
      </aside>
    </>
  )
}
