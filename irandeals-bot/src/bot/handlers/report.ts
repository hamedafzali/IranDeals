import type { MyContext } from '../bot'
import { t } from '../utils/i18n'
import { prisma } from '../../index'
import { ADMIN_IDS } from '../../config/settings'
import { bot } from '../bot'

const REPORT_THRESHOLD = 3
const REPORT_WINDOW_DAYS = 30

export async function handleReportDeal(ctx: MyContext) {
  const dealId = (ctx.callbackQuery?.data ?? '').replace('report:', '')
  if (!dealId) { await ctx.answerCallbackQuery(); return }

  const lang = ctx.session.language
  const telegramId = BigInt(ctx.from!.id)

  const sub = await prisma.subscriber.findUnique({ where: { telegramId } })
  if (!sub) { await ctx.answerCallbackQuery({ text: 'Please subscribe first with /start.' }); return }

  const deal = await prisma.deal.findUnique({ where: { id: dealId }, include: { business: true } })
  if (!deal) { await ctx.answerCallbackQuery({ text: 'Deal not found.' }); return }

  // Check for duplicate report
  const existing = await prisma.dealReport.findUnique({
    where: { dealId_subscriberId: { dealId, subscriberId: sub.id } },
  })
  if (existing) {
    await ctx.answerCallbackQuery({ text: t('report_already', lang), show_alert: true })
    return
  }

  // Record the report
  await prisma.dealReport.create({ data: { dealId, subscriberId: sub.id } })
  await ctx.answerCallbackQuery({ text: t('report_done', lang), show_alert: true })

  // Count reports for this business in the last 30 days
  const windowStart = new Date(Date.now() - REPORT_WINDOW_DAYS * 86400_000)
  const reportCount = await prisma.dealReport.count({
    where: {
      deal: { businessId: deal.businessId },
      createdAt: { gte: windowStart },
    },
  })

  // Notify admins
  const alertMsg = t('admin_report_alert', 'en', {
    dealTitle: deal.title,
    businessName: deal.business.name,
    count: reportCount,
    businessId: deal.businessId,
  })
  for (const adminId of ADMIN_IDS) {
    await bot.api.sendMessage(adminId, alertMsg, { parse_mode: 'Markdown' }).catch(() => {})
  }

  // Auto-pause if threshold reached
  if (reportCount >= REPORT_THRESHOLD && deal.business.status === 'approved') {
    await prisma.business.update({
      where: { id: deal.businessId },
      data: { status: 'paused' },
    })
    await prisma.adminLog.create({
      data: {
        adminTelegramId: 0n,
        action: 'autopause',
        targetType: 'business',
        targetId: deal.businessId,
        note: `Auto-paused after ${reportCount} reports in 30 days`,
      },
    })

    const pauseMsg = t('admin_autopause_alert', 'en', {
      businessName: deal.business.name,
      count: reportCount,
      businessId: deal.businessId,
    })
    for (const adminId of ADMIN_IDS) {
      await bot.api.sendMessage(adminId, pauseMsg, { parse_mode: 'Markdown' }).catch(() => {})
    }
  }
}
