type UnitPair = {
  unit?: string
  altUnit?: string
  conversionRate?: string | number
  nameKm?: string
}

const MAIN_UNITS = new Set(['case', 'box', 'carton', 'pack', 'package', 'កេស', 'កញ្ចប់'])
const MINOR_UNITS = new Set(['can', 'bottle', 'piece', 'sheet', 'unit', 'កំប៉ុង', 'ដប', 'ដុំ', 'សន្លឹក'])
const PIECE_PACK_PRODUCTS = new Set(['ក្រដាសជូតមាត់', 'កន្សែងត្រជាក់', 'ឈូករត', 'សសៃត្រី'])

/** Reads both current main/minor records and legacy records saved in the reverse order. */
export function normalizeUnitPair<T extends UnitPair>(product: T, categoryLabel = ''): T {
  const unit = (product.unit || '').trim().toLowerCase()
  const altUnit = (product.altUnit || '').trim().toLowerCase()
  const rate = Number(product.conversionRate) || 1

  // These products are counted internally as packs, with each outer piece
  // containing the configured number of packs. Keep the outer piece first.
  const nameKm = (product.nameKm || '').trim()
  if (rate > 1 && PIECE_PACK_PRODUCTS.has(nameKm)) {
    return { ...product, unit: 'piece', altUnit: 'pack' }
  }

  if (rate > 1 && MINOR_UNITS.has(unit) && MAIN_UNITS.has(altUnit)) {
    return { ...product, unit: product.altUnit, altUnit: product.unit }
  }
  const context = `${categoryLabel} ${(product as any).name || ''} ${(product as any).nameKm || ''}`.toLowerCase()
  const isBeerOrWater = /beer|cider|water|ស្រាបៀរ|ស៊ីដឺ|ទឹក/.test(context)
  if (isBeerOrWater && rate <= 1 && !altUnit && MINOR_UNITS.has(unit) && ['can', 'bottle', 'កំប៉ុង', 'ដប'].includes(unit)) {
    return { ...product, unit: 'case', altUnit: product.unit, conversionRate: 24 }
  }
  return product
}

export function configuredPurchaseCost(product: UnitPair & { purchaseCost?: string | number }, units: UnitPair): number {
  const cost = Number(product.purchaseCost) || 0
  const originallyUnpackaged = !product.altUnit && (Number(product.conversionRate) || 1) <= 1
  return originallyUnpackaged && Number(units.conversionRate) > 1 ? cost * Number(units.conversionRate) : cost
}
