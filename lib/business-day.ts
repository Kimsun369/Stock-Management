/**
 * Business Day calculation helper for Cambodia (Asia/Phnom_Penh, UTC+7).
 *
 * In hospitality & nightlife venues (karaoke lounges, bars), operations frequently
 * extend past midnight. A configurable cutoff hour (e.g. 05:00 AM) determines when
 * a new business day starts.
 *
 * For example, with BUSINESS_DAY_START_HOUR = 5:
 *   - A transaction on 2026-11-21 at 00:30 AM (local) falls on business day 2026-11-20.
 *   - A transaction on 2026-11-21 at 04:59 AM (local) falls on business day 2026-11-20.
 *   - A transaction on 2026-11-21 at 05:00 AM (local) starts business day 2026-11-21.
 */

export const CAMBODIA_TIMEZONE = 'Asia/Phnom_Penh'
export const CAMBODIA_UTC_OFFSET_HOURS = 7 // UTC+7 constant, no daylight saving time

export function getConfiguredCutoffHour(): number {
  const envVal = typeof process !== 'undefined' && process.env
    ? (process.env.BUSINESS_DAY_START_HOUR || process.env.NEXT_PUBLIC_BUSINESS_DAY_START_HOUR)
    : undefined
  if (envVal !== undefined && envVal !== '') {
    const parsed = Number(envVal)
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 23) {
      return parsed
    }
  }
  return 5 // default 05:00 AM
}

/**
 * Converts a UTC timestamp/Date to the Cambodia local Date object.
 */
export function toCambodiaLocalDate(dateInput: Date | string | number): Date {
  const d = new Date(dateInput)
  if (Number.isNaN(d.getTime())) return new Date()

  // Calculate local time in Asia/Phnom_Penh (UTC+7)
  const utcMillis = d.getTime()
  const cambodiaMillis = utcMillis + CAMBODIA_UTC_OFFSET_HOURS * 60 * 60 * 1000
  return new Date(cambodiaMillis)
}

/**
 * Returns the business date string in YYYY-MM-DD format for any timestamp
 * according to Asia/Phnom_Penh timezone and the venue cutoff hour.
 */
export function toBusinessDate(
  dateInput: Date | string | number,
  cutoffHour = getConfiguredCutoffHour()
): string {
  const cambodiaDate = toCambodiaLocalDate(dateInput)

  // Use UTC methods on the offset date to avoid host environment timezone interference
  let year = cambodiaDate.getUTCFullYear()
  let month = cambodiaDate.getUTCMonth() // 0-11
  let day = cambodiaDate.getUTCDate()
  const hour = cambodiaDate.getUTCHours()

  // If local time is before the cutoff hour, it belongs to the previous calendar day
  if (hour < cutoffHour) {
    const prevDay = new Date(Date.UTC(year, month, day - 1))
    year = prevDay.getUTCFullYear()
    month = prevDay.getUTCMonth()
    day = prevDay.getUTCDate()
  }

  const mm = String(month + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

/**
 * Formats a timestamp into a user-friendly Cambodia local date/time string (dd/MM/yyyy HH:mm).
 */
export function formatCambodiaDateTime(dateInput: Date | string | number): string {
  const cambodiaDate = toCambodiaLocalDate(dateInput)
  if (Number.isNaN(cambodiaDate.getTime())) return '—'

  const day = String(cambodiaDate.getUTCDate()).padStart(2, '0')
  const month = String(cambodiaDate.getUTCMonth() + 1).padStart(2, '0')
  const year = cambodiaDate.getUTCFullYear()
  const hours = String(cambodiaDate.getUTCHours()).padStart(2, '0')
  const minutes = String(cambodiaDate.getUTCMinutes()).padStart(2, '0')

  return `${day}/${month}/${year} ${hours}:${minutes}`
}

/**
 * Returns the business day date range [startDateStr, endDateStr] for standard presets.
 */
export function getPresetDateRange(preset: 'today' | 'yesterday' | 'last7days' | 'thisMonth', cutoffHour = getConfiguredCutoffHour()): {
  startDate: string
  endDate: string
} {
  const now = new Date()
  const todayBusinessStr = toBusinessDate(now, cutoffHour)

  const [y, m, d] = todayBusinessStr.split('-').map(Number)
  const todayRef = new Date(Date.UTC(y, m - 1, d))

  if (preset === 'today') {
    return { startDate: todayBusinessStr, endDate: todayBusinessStr }
  }

  if (preset === 'yesterday') {
    const yesterdayRef = new Date(Date.UTC(y, m - 1, d - 1))
    const yesterdayStr = `${yesterdayRef.getUTCFullYear()}-${String(yesterdayRef.getUTCMonth() + 1).padStart(2, '0')}-${String(yesterdayRef.getUTCDate()).padStart(2, '0')}`
    return { startDate: yesterdayStr, endDate: yesterdayStr }
  }

  if (preset === 'last7days') {
    const past7Ref = new Date(Date.UTC(y, m - 1, d - 6))
    const startStr = `${past7Ref.getUTCFullYear()}-${String(past7Ref.getUTCMonth() + 1).padStart(2, '0')}-${String(past7Ref.getUTCDate()).padStart(2, '0')}`
    return { startDate: startStr, endDate: todayBusinessStr }
  }

  if (preset === 'thisMonth') {
    const startOfMonth = `${y}-${String(m).padStart(2, '0')}-01`
    return { startDate: startOfMonth, endDate: todayBusinessStr }
  }

  return { startDate: '', endDate: '' }
}
