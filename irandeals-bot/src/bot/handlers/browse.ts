import type { MyContext } from '../bot'
import { t } from '../utils/i18n'
import { formatDealMessage } from '../utils/formatting'
import { reportDealKeyboard } from '../utils/keyboards'
import { prisma } from '../../index'

export async function cmdDeals(ctx: MyContext) {
  const lang = ctx.session.language
  const sub = await prisma.subscriber.findUnique({ where: { telegramId: BigInt(ctx.from!.id) } })
  if (!sub?.active || !sub.cities.length) {
    await ctx.reply('Please subscribe first with /start to browse deals in your city.')
    return
  }
  const now = new Date()
  const deals = await prisma.deal.findMany({
    where: { active: true, expiresAt: { gt: now }, OR: [{ targetCity: { in: sub.cities } }, { targetCity: null }] },
    include: { business: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
  const citySet = new Set(sub.cities)
  const filtered = deals.filter(d => citySet.has(d.targetCity ?? '') || d.targetCity === null)
  if (!filtered.length) { await ctx.reply(t('browse_no_deals', lang)); return }
  for (const deal of filtered.slice(0, 5)) {
    await ctx.reply(formatDealMessage(deal, deal.business, lang), {
      parse_mode: 'Markdown',
      reply_markup: reportDealKeyboard(deal.id),
    })
  }
}
