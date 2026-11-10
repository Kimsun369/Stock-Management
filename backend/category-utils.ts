type CategoryLike = { id: string; name?: string; nameKm?: string }

/** Beer and Beer & Cider are one user-facing category. */
export function isBeerCategory(category: CategoryLike): boolean {
  const name = (category.name || '').trim().toLowerCase().replace(/\s+/g, ' ')
  const nameKm = (category.nameKm || '').trim().replace(/\s+/g, ' ')
  return name === 'beer' || name === 'beer & cider' || name === 'beer and cider' ||
    nameKm === 'ស្រាបៀរ' || nameKm === 'ស្រាបៀរ និងស៊ីដឺ'
}

export function beerCategoryIds(categories: CategoryLike[]): Set<string> {
  return new Set(categories.filter(isBeerCategory).map((category) => category.id))
}

export function canonicalBeerCategoryId(categories: CategoryLike[]): string | undefined {
  const beerCategories = categories.filter(isBeerCategory)
  return beerCategories.find((category) => (category.name || '').trim().toLowerCase() === 'beer')?.id || beerCategories[0]?.id
}
