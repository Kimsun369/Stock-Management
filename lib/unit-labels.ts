export function formatUnitLabel(unit: string | undefined, t: (key: string) => string): string {
  if (!unit) return ''
  const key = unit.replace(/^products\.units\./, '').split('/')[0].trim()
  const translated = t(`products.units.${key}`)
  if (!translated.startsWith('products.units.')) return translated
  const khmerFallback: Record<string, string> = {
    can: 'កំប៉ុង', bottle: 'ដប', box: 'កេស', carton: 'កេស', case: 'កេស',
    piece: 'ដុំ', pack: 'កញ្ចប់', sheet: 'សន្លឹក', unit: 'មុខ', units: 'មុខ',
    package: 'កញ្ចប់',
  }
  return khmerFallback[key] || key
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
