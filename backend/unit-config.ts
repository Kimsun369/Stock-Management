type UnitPair = {
  unit?: string
  altUnit?: string
  conversionRate?: string | number
  nameKm?: string
}

const MINOR_UNITS = new Set(['can', 'bottle', 'piece', 'sheet', 'unit', 'កំប៉ុង', 'ដប', 'ដុំ', 'សន្លឹក'])

/** Packaging hierarchy rank (higher = outer container, lower = inner/counted unit). */
const UNIT_RANK: Record<string, number> = {
  case: 3,
  pack: 1,
  piece: 2,
  can: 0,
  bottle: 0,
  sheet: 0,
  unit: 0,
  kg: 0,
  g: 0,
  liter: 0,
}

/** Canonicalize Khmer or alias unit strings to their English canonical form. */
function canonicalUnit(u: string): string {
  const v = u.trim().toLowerCase()
  const map: Record<string, string> = {
    'កេស': 'case', 'carton': 'case', 'box': 'case',
    'កញ្ចប់': 'pack', 'package': 'pack',
    'កំប៉ុង': 'can', 'ដប': 'bottle', 'ដុំ': 'piece',
    'សន្លឹក': 'sheet', 'មុខ': 'unit', 'ឯកតា': 'unit',
    'គីឡូក្រាម': 'kg', 'ក្រាម': 'g', 'លីត្រ': 'liter',
  }
  return map[v] || v
}

/** Reads both current main/minor records and legacy records saved in the reverse order.
 *  Always returns canonical English unit strings (outer packaging as `unit`, inner unit as `altUnit`). */
export function normalizeUnitPair<T extends UnitPair>(product: T, categoryLabel = ''): T {
  const rawUnit = canonicalUnit(product.unit || '')
  const rawAltUnit = product.altUnit ? canonicalUnit(product.altUnit) : ''
  const rate = Number(product.conversionRate) || 1

  // Ensure outer packaging unit is always `unit` and inner counted unit is `altUnit`
  if (rate > 1 && rawUnit && rawAltUnit) {
    const unitRank = UNIT_RANK[rawUnit] ?? 0
    const altRank = UNIT_RANK[rawAltUnit] ?? 0
    if (altRank > unitRank) {
      return { ...product, unit: rawAltUnit, altUnit: rawUnit }
    }
    if (rawUnit !== (product.unit || '') || rawAltUnit !== (product.altUnit || '')) {
      return { ...product, unit: rawUnit, altUnit: rawAltUnit }
    }
    return product
  }

  const context = `${categoryLabel} ${(product as any).name || ''} ${(product as any).nameKm || ''}`.toLowerCase()
  const isBeerOrWater = /beer|cider|water|ស្រាបៀរ|ស៊ីដឺ|ទឹក/.test(context)
  if (isBeerOrWater && rate <= 1 && !rawAltUnit && MINOR_UNITS.has(rawUnit) && ['can', 'bottle'].includes(rawUnit)) {
    return { ...product, unit: 'case', altUnit: rawUnit, conversionRate: 24 }
  }

  if (rawUnit !== (product.unit || '') || rawAltUnit !== (product.altUnit || '')) {
    return { ...product, unit: rawUnit, altUnit: rawAltUnit }
  }

  return product
}

export function configuredPurchaseCost(product: UnitPair & { purchaseCost?: string | number }, units: UnitPair): number {
  const cost = Number(product.purchaseCost) || 0
  const originallyUnpackaged = !product.altUnit && (Number(product.conversionRate) || 1) <= 1
  return originallyUnpackaged && Number(units.conversionRate) > 1 ? cost * Number(units.conversionRate) : cost
}
