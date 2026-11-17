export function formatUnitLabel(unit: string | undefined, t: (key: string) => string): string {
  if (!unit) return ''
  const rawKey = unit.replace(/^products\.units\./, '').split('/')[0].trim().toLowerCase()
  const aliases: Record<string, string> = {
    'កំប៉ុង': 'can', 'ដប': 'bottle', 'កេស': 'case', 'កញ្ចប់': 'pack',
    'ដុំ': 'piece', 'សន្លឹក': 'sheet', 'មុខ': 'unit', 'ឯកតា': 'unit',
    'គីឡូក្រាម': 'kg', 'ក្រាម': 'g', 'លីត្រ': 'liter',
  }
  const key = aliases[rawKey] || rawKey
  const translated = t(`products.units.${key}`)
  if (!translated.startsWith('products.units.')) return translated
  const fallback: Record<string, { en: string; km: string }> = {
    can: { en: 'Can(s)', km: 'កំប៉ុង' }, bottle: { en: 'Bottle(s)', km: 'ដប' },
    box: { en: 'Box(es)', km: 'កេស' }, carton: { en: 'Carton(s)', km: 'កេស' },
    case: { en: 'Case(s)', km: 'កេស' }, piece: { en: 'Piece(s)', km: 'ដុំ' },
    pack: { en: 'Pack(s)', km: 'កញ្ចប់' }, package: { en: 'Package(s)', km: 'កញ្ចប់' },
    sheet: { en: 'Sheet(s)', km: 'សន្លឹក' }, unit: { en: 'Unit(s)', km: 'មុខ' },
    kg: { en: 'Kilogram(s)', km: 'គីឡូក្រាម' }, g: { en: 'Gram(s)', km: 'ក្រាម' },
    liter: { en: 'Liter(s)', km: 'លីត្រ' },
  }
  const languageFallback = fallback[key]
  const isKhmer = t('products.units.unit') === 'មុខ'
  return languageFallback ? (isKhmer ? languageFallback.km : languageFallback.en) : key
}

export function formatStockQuantity(
  quantity: number,
  mainUnit: string | undefined,
  minorUnit: string | undefined,
  conversionRate: number | undefined,
  t: (key: string) => string,
): string {
  const main = formatUnitLabel(mainUnit, t)
  const minor = formatUnitLabel(minorUnit, t)
  const rate = Number(conversionRate)
  const amount = Math.max(0, Math.floor(Number(quantity) || 0))
  if (!main || !minor || !Number.isInteger(rate) || rate <= 1) return `${amount} ${main}`.trim()
  const mainCount = Math.floor(amount / rate)
  const minorCount = amount % rate
  if (mainCount && minorCount) return `${mainCount} ${main} ${minorCount} ${minor}`
  if (mainCount) return `${mainCount} ${main}`
  return `${minorCount} ${minor}`
}
