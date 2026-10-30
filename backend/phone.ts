/**
 * Cambodian phone number utilities and normalization.
 * Handles:
 * - Khmer Unicode digits: ០១២៣៤៥៦៧៨៩ -> 0123456789
 * - Spaces, dashes, dots, parentheses
 * - Standard prefixes: '0' (local) and '+855' / '855' (international)
 */

const KHMER_TO_LATIN_DIGITS: Record<string, string> = {
  '០': '0', '១': '1', '២': '2', '៣': '3', '៤': '4',
  '៥': '5', '៦': '6', '៧': '7', '៨': '8', '៩': '9',
}

const LATIN_TO_KHMER_DIGITS: Record<string, string> = {
  '0': '០', '1': '១', '2': '២', '3': '៣', '4': '៤',
  '5': '៥', '6': '៦', '7': '៧', '8': '៨', '9': '៩',
}

export function convertKhmerToLatinDigits(input: string): string {
  return input.replace(/[០-៩]/g, (ch) => KHMER_TO_LATIN_DIGITS[ch] || ch)
}

export function convertLatinToKhmerDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (ch) => LATIN_TO_KHMER_DIGITS[ch] || ch)
}

export function normalizePhoneNumber(raw: string): string {
  if (!raw) return ''
  let cleaned = convertKhmerToLatinDigits(raw.trim())
  cleaned = cleaned.replace(/[\s\-\(\)\.]/g, '')

  if (cleaned.startsWith('+855')) {
    cleaned = '0' + cleaned.slice(4)
  } else if (cleaned.startsWith('855') && cleaned.length >= 11) {
    cleaned = '0' + cleaned.slice(3)
  }

  if (/^[1-9]\d{7,8}$/.test(cleaned)) {
    cleaned = '0' + cleaned
  }

  return cleaned
}

export function formatPhoneNumber(phone: string, useKhmerDigits = false): string {
  const norm = normalizePhoneNumber(phone)
  let formatted = norm
  if (norm.length === 9) {
    formatted = `${norm.slice(0, 3)} ${norm.slice(3, 6)} ${norm.slice(6)}`
  } else if (norm.length === 10) {
    formatted = `${norm.slice(0, 3)} ${norm.slice(3, 6)} ${norm.slice(6)}`
  }
  return useKhmerDigits ? convertLatinToKhmerDigits(formatted) : formatted
}

export function maskPhoneNumber(phone: string): string {
  const norm = normalizePhoneNumber(phone)
  if (norm.length >= 7) {
    return `${norm.slice(0, 3)} ••• ${norm.slice(-3)}`
  }
  return norm
}

