import { prisma } from '../../index'
import { bot } from '../bot'
import { formatDigest } from '../utils/formatting'
import { config } from '../../config/settings'

async function sendDigestToSubscribers(frequency: 'daily' | 'weekly') {
  const hours = frequency === 'daily' ? 24 : 168
  const cutoff = new Date(Date.now() - hours * 3600_000)
  const limit = frequency === 'daily' ? config.MAX_DIGEST_DEALS : config.MAX_WEEKLY_DIGEST_DEALS
  const channel = frequency === 'daily' ? 'daily_digest' : 'weekly_digest'

  const recentDeals = await prisma.deal.findMany({
    where: { active: true, createdAt: { gte: cutoff } },
    include: { business: true },
    orderBy: { createdAt: 'desc' },
  })
  if (!recentDeals.length) return

  const subscribers = await prisma.subscriber.findMany({ where: { active: true, frequency } })

  for (const sub of subscribers) {
    const matching = recentDeals.filter(d => {
      if (!sub.categories.includes(d.business.category)) return false
      if (d.targetCity && !sub.cities.includes(d.targetCity)) return false
      return true
    }).slice(0, limit)

    if (!matching.length) continue

    // De-duplicate: skip already delivered
    const delivered = await prisma.dealDelivery.findMany({
      where: { subscriberId: sub.id, dealId: { in: matching.map(d => d.id) } },
      select: { dealId: true },
    })
    const deliveredIds = new Set(delivered.map(d => d.dealId))
    const toSend = matching.filter(d => !deliveredIds.has(d.id))
    if (!toSend.length) continue

    const lang = (sub.language as 'en' | 'fa') ?? 'en'
    const msg = formatDigest(toSend.map(deal => ({ deal, business: deal.business })), lang)

    try {
      await bot.api.sendMessage(Number(sub.telegramId), msg, { parse_mode: 'Markdown' })
      await prisma.dealDelivery.createMany({
        data: toSend.map(d => ({ dealId: d.id, subscriberId: sub.id, channel })),
        skipDuplicates: true,
      })
    } catch (e: any) {
      if (/blocked|deactivated/.test(String(e))) {
        await prisma.subscriber.update({ where: { id: sub.id }, data: { active: false } })
      }
    }
  }
  console.log(`[${frequency} digest] done`)
}

export const sendDailyDigest = () => sendDigestToSubscribers('daily')
export const sendWeeklyDigest = () => sendDigestToSubscribers('weekly')
