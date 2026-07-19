import { prisma } from '@/lib/prisma'

export function normalizeCityUpsertInput(params: {
  name: string
  state?: string | null
  country?: string
}): { name: string; state: string | null; country: string } {
  return {
    name: params.name.trim(),
    state: params.state?.trim() || null,
    country: (params.country ?? 'USA').trim() || 'USA',
  }
}

export async function upsertCityByName(params: {
  name: string
  state?: string | null
  country?: string
}) {
  const { name, state, country } = normalizeCityUpsertInput(params)

  if (!state) {
    const existing = await prisma.city.findFirst({
      where: { name, state: null, country },
    })
    if (existing) return existing

    return prisma.city.create({
      data: { name, state: null, country },
    })
  }

  return prisma.city.upsert({
    where: {
      name_state_country: {
        name,
        state,
        country,
      },
    },
    update: {},
    create: {
      name,
      state,
      country,
    },
  })
}
