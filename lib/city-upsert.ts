import { prisma } from '@/lib/prisma'

export async function upsertCityByName(params: {
  name: string
  state?: string | null
  country?: string
}) {
  const country = (params.country ?? 'USA').trim()
  const name = params.name.trim()
  return prisma.city.upsert({
    where: {
      name_state_country: {
        name,
        state: params.state?.trim() ?? null,
        country,
      } as any,
    },
    update: {},
    create: {
      name,
      state: params.state?.trim() || null,
      country,
    },
  })
}
