import { Router } from 'express'
import { prisma } from '../../index'

const router = Router()

router.get('/summary', async (_req, res) => {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86400_000)
  const monthAgo = new Date(now.getTime() - 30 * 86400_000)

  const [
    bizByStatus, totalSubs, subsByFreq, subsByLang,
    activeDeals, dealsThisWeek, dealsThisMonth,
    deliveryByChannel, deliveriesThisWeek,
    totalCountries, totalCities,
  ] = await Promise.all([
    prisma.business.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.subscriber.count({ where: { active: true } }),
    prisma.subscriber.groupBy({ by: ['frequency'], where: { active: true }, _count: { id: true } }),
    prisma.subscriber.groupBy({ by: ['language'], where: { active: true }, _count: { id: true } }),
    prisma.deal.count({ where: { active: true, expiresAt: { gt: now } } }),
    prisma.deal.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.deal.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.dealDelivery.groupBy({ by: ['channel'], _count: { id: true } }),
    prisma.dealDelivery.count({ where: { sentAt: { gte: weekAgo } } }),
    prisma.country.count({ where: { active: true } }),
    prisma.city.count({ where: { active: true } }),
  ])

  // Top cities by active deals
  const topCitiesDeals = await prisma.deal.groupBy({
    by: ['targetCity'],
    where: { active: true, targetCity: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 8,
  })

  // Deals by category (via business join)
  const dealsByCategory = await prisma.deal.findMany({
    where: { active: true },
    include: { business: { select: { category: true } } },
  })
  const categoryCount: Record<string, number> = {}
  for (const d of dealsByCategory) categoryCount[d.business.category] = (categoryCount[d.business.category] ?? 0) + 1

  res.json({
    businesses: {
      total: bizByStatus.reduce((s, r) => s + r._count.id, 0),
      byStatus: Object.fromEntries(bizByStatus.map(r => [r.status, r._count.id])),
    },
    subscribers: {
      total: totalSubs,
      byFrequency: Object.fromEntries(subsByFreq.map(r => [r.frequency, r._count.id])),
      byLanguage: Object.fromEntries(subsByLang.map(r => [r.language, r._count.id])),
    },
    deals: {
      active: activeDeals,
      thisWeek: dealsThisWeek,
      thisMonth: dealsThisMonth,
      byCategory: categoryCount,
    },
    deliveries: {
      total: deliveryByChannel.reduce((s, r) => s + r._count.id, 0),
      byChannel: Object.fromEntries(deliveryByChannel.map(r => [r.channel, r._count.id])),
      thisWeek: deliveriesThisWeek,
    },
    locations: { countries: totalCountries, cities: totalCities },
    topCitiesDeals: topCitiesDeals.map(r => ({ city: r.targetCity, count: r._count.id })),
  })
})

export default router
