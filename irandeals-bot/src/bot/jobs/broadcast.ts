import { prisma } from '../../index'
import { bot } from '../bot'
import { formatDealMessage } from '../utils/formatting'
import { config } from '../../config/settings'

export async function broadcastDeal(dealId: string) {
  const deal = await prisma.deal.findUnique({ where: { id: dealId }, include: { business: true } })
  if (!deal?.active) return
  const msg = formatDealMessage(deal, deal.business, 'en')

  const today = new Date(); today.setHours(0, 0, 0, 0)

  const subscribers = await prisma.subscriber.findMany({
    where: {
      active: true,
      frequency: 'instant',
      categories: { has: deal.business.category },
      ...(deal.targetCity ? { cities: { has: deal.targetCity } } : {}),
    },
  })

  let sent = 0
  for (const sub of subscribers) {
    const alreadyDelivered = await prisma.dealDelivery.findFirst({ where: { dealId, subscriberId: sub.id } })
    if (alreadyDelivered) continue

    const todayCount = await prisma.dealDelivery.count({
      where: { subscriberId: sub.id, channel: 'direct', sentAt: { gte: today } },
    })
    if (todayCount >= config.MAX_INSTANT_PER_DAY) continue

    const lang = (sub.language as 'en' | 'fa') ?? 'en'
    const msg = formatDealMessage(deal, deal.business, lang)
    try {
      if (deal.imageUrl?.startsWith('tg://')) {
        await bot.api.sendPhoto(Number(sub.telegramId), deal.imageUrl.replace('tg://', ''), { caption: msg, parse_mode: 'Markdown' })
      } else {
        await bot.api.sendMessage(Number(sub.telegramId), msg, { parse_mode: 'Markdown' })
      }
      await prisma.dealDelivery.create({ data: { dealId, subscriberId: sub.id, channel: 'direct' } })
      sent++
    } catch (e: any) {
      if (/blocked|deactivated/.test(String(e))) {
        await prisma.subscriber.update({ where: { id: sub.id }, data: { active: false } })
      }
    }
  }

  if (config.PUBLIC_CHANNEL_ID) {
    try {
      if (deal.imageUrl?.startsWith('tg://')) {
        await bot.api.sendPhoto(config.PUBLIC_CHANNEL_ID, deal.imageUrl.replace('tg://', ''), {
          caption: msg,
          parse_mode: 'Markdown',
        })
      } else {
        await bot.api.sendMessage(config.PUBLIC_CHANNEL_ID, msg, { parse_mode: 'Markdown' })
      }
    } catch (e) {
      console.error(`[broadcast] Failed to post deal ${dealId} to public channel`, e)
    }
  }

  await prisma.deal.update({ where: { id: dealId }, data: { broadcastAt: new Date() } })
  console.log(`[broadcast] Deal ${dealId} → ${sent} subscribers`)
}
