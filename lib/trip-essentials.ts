/** Dining categories used for groceries / essentials near lodging. */
export const ESSENTIAL_CATEGORIES = [
  'Grocery',
  'Pharmacy',
  'Coffee',
  'Convenience',
] as const

export type EssentialCategory = (typeof ESSENTIAL_CATEGORIES)[number]

export function isEssentialCategory(category: string | null | undefined): boolean {
  if (!category?.trim()) return false
  const normalized = category.trim().toLowerCase()
  return ESSENTIAL_CATEGORIES.some((c) => c.toLowerCase() === normalized)
}

export function partitionDiningByEssentials<
  T extends { category?: string | null },
>(dining: T[]): { essentials: T[]; regularDining: T[] } {
  const essentials: T[] = []
  const regularDining: T[] = []
  for (const row of dining) {
    if (isEssentialCategory(row.category)) essentials.push(row)
    else regularDining.push(row)
  }
  return { essentials, regularDining }
}

export const ESSENTIAL_QUICK_SEARCHES: { label: string; query: string; category: EssentialCategory }[] =
  [
    {
      label: 'Grocery stores near hotel',
      query: 'grocery store',
      category: 'Grocery',
    },
    {
      label: 'Pharmacy near hotel',
      query: 'pharmacy',
      category: 'Pharmacy',
    },
    {
      label: 'Coffee near hotel',
      query: 'coffee shop',
      category: 'Coffee',
    },
    {
      label: 'Convenience store near hotel',
      query: 'convenience store',
      category: 'Convenience',
    },
  ]
