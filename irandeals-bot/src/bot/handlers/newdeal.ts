import { addDays, endOfDay } from 'date-fns'
import { InlineKeyboard } from 'grammy'
import type { MyContext } from '../bot'
import { t } from '../utils/i18n'
import { expiryKeyboard, regionKeyboard, confirmKeyboard } from '../utils/keyboards'
import { containsPhone, isValidDate } from '../utils/validators'
import { formatDealMessage } from '../utils/formatting'
import { prisma } from '../../index'
import { config } from '../../config/settings'
import { broadcastDeal } from '../jobs/broadcast'

export async function cmdNewDeal(ctx: MyContext) {
  const lang = ctx.session.language
  const biz = await prisma.business.findUnique({ where: { telegramId: BigInt(ctx.from!.id) } })
  if (!biz || biz.status !== 'approved') { await ctx.reply(t('deal_not_approved', lang)); return }
  const weekAgo = new Date(Date.now() - 7 * 86400_000)
  const count = await prisma.deal.count({ where: { businessId: biz.id, createdAt: { gte: weekAgo } } })
  if (count >= config.MAX_DEALS_PER_WEEK) { await ctx.reply(t('deal_limit_exceeded', lang, { max: config.MAX_DEALS_PER_WEEK })); return }
  ctx.session.state = 'DEAL_TITLE'
  ctx.session.flowData = { businessId: biz.id, city: biz.city, country: biz.country, category: biz.category, businessName: biz.name }
  await ctx.reply(t('deal_prompt_title', lang))
}

export async function handleDealTitle(ctx: MyContext) {
  const title = ctx.message?.text?.trim().slice(0, 200) ?? ''
  const lang = ctx.session.language
  const biz = await prisma.business.findUnique({ where: { telegramId: BigInt(ctx.from!.id) } })
  if (biz) {
    const dupe = await prisma.deal.findFirst({ where: { businessId: biz.id, title, createdAt: { gte: new Date(Date.now() - 7 * 86400_000) } } })
    if (dupe) { await ctx.reply(t('deal_duplicate', lang)); return }
  }
  ctx.session.flowData.title = title
  ctx.session.state = 'DEAL_DESC'
  await ctx.reply(t('deal_prompt_description', lang))
}

export async function handleDealDesc(ctx: MyContext) {
  const desc = ctx.message?.text?.trim() ?? ''
  const lang = ctx.session.language
  if (containsPhone(desc)) { await ctx.reply('⚠️ Please do not include phone numbers in deal descriptions.'); return }
  ctx.session.flowData.description = desc
  ctx.session.state = 'DEAL_EXPIRY'
  await ctx.reply(t('deal_prompt_expiry', lang), { reply_markup: expiryKeyboard() })
}

export async function handleDealExpiry(ctx: MyContext) {
  const val = (ctx.callbackQuery?.data ?? '').replace('expiry:', '')
  const lang = ctx.session.language
  if (val === 'custom') {
    ctx.session.state = 'DEAL_EXPIRY_CUSTOM'
    await ctx.editMessageText(t('deal_custom_expiry_prompt', lang))
    await ctx.answerCallbackQuery()
    return
  }
  const days = parseInt(val)
  const expiresAt = days === 0 ? endOfDay(new Date()) : addDays(new Date(), days)
  ctx.session.flowData.expiresAt = expiresAt.toISOString()
  ctx.session.state = 'DEAL_IMAGE'
  await ctx.editMessageText(t('deal_prompt_image', lang))
  await ctx.answerCallbackQuery()
}

export async function handleDealExpiryCustom(ctx: MyContext) {
  const str = ctx.message?.text?.trim() ?? ''
  const lang = ctx.session.language
  if (!isValidDate(str)) { await ctx.reply(t('deal_invalid_date', lang)); return }
  ctx.session.flowData.expiresAt = new Date(str + 'T23:59:59Z').toISOString()
  ctx.session.state = 'DEAL_IMAGE'
  await ctx.reply(t('deal_prompt_image', lang))
}

export async function handleDealImage(ctx: MyContext) {
  const lang = ctx.session.language
  if (ctx.message?.photo?.length) {
    ctx.session.flowData.imageUrl = `tg://${ctx.message.photo.at(-1)!.file_id}`
  }
  ctx.session.state = 'DEAL_REGION'
  const { city, country } = ctx.session.flowData as { city: string; country: string }
  await ctx.reply(t('deal_prompt_region', lang), { reply_markup: regionKeyboard(city, country) })
}

export async function handleDealRegion(ctx: MyContext) {
  const region = (ctx.callbackQuery?.data ?? '').replace('region:', '')
  ctx.session.flowData.region = region
  ctx.session.state = 'DEAL_CONFIRM'
  const lang = ctx.session.language
  const d = ctx.session.flowData as Record<string, string>
  const preview = `🏷 *${d.businessName}* — ${d.city}\n\n*${d.title}*\n${d.description}\n\n⏳ ${d.expiresAt?.split('T')[0]}\n📍 ${d.city} | 🏪 ${d.category}`
  await ctx.editMessageText(t('deal_confirm_prompt', lang, { preview }), {
    reply_markup: confirmKeyboard(),
    parse_mode: 'Markdown',
  })
  await ctx.answerCallbackQuery()
}

export async function handleDealConfirm(ctx: MyContext) {
  const answer = (ctx.callbackQuery?.data ?? '').replace('confirm:', '')
  const lang = ctx.session.language
  if (answer === 'edit') {
    ctx.session.state = 'DEAL_TITLE'
    const d = ctx.session.flowData as Record<string, string>
    delete d.title
    await ctx.editMessageText(t('deal_prompt_title', lang))
    await ctx.answerCallbackQuery()
    return
  }
  const d = ctx.session.flowData as Record<string, string>
  const deal = await prisma.deal.create({
    data: {
      businessId: d.businessId,
      title: d.title,
      description: d.description,
      imageUrl: d.imageUrl ?? null,
      targetCountry: d.country,
      targetCity: d.region === 'city' ? d.city : null,
      expiresAt: new Date(d.expiresAt),
    },
  })
  ctx.session.state = 'IDLE'
  ctx.session.flowData = {}
  await ctx.editMessageText(t('deal_posted', lang))
  await ctx.answerCallbackQuery()
  broadcastDeal(deal.id).catch(console.error)
}

export async function cmdEditDeal(ctx: MyContext) {
  const lang = ctx.session.language
  const biz = await prisma.business.findUnique({ where: { telegramId: BigInt(ctx.from!.id) } })
  if (!biz || biz.status !== 'approved') { await ctx.reply(t('deal_not_approved', lang)); return }

  const deals = await prisma.deal.findMany({
    where: { businessId: biz.id, active: true, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })

  if (!deals.length) { await ctx.reply(t('editdeal_no_deals', lang)); return }

  const kb = new InlineKeyboard()
  for (const d of deals) {
    const label = `${d.title.slice(0, 40)} — ${d.expiresAt.toISOString().split('T')[0]}`
    kb.text(label, `editdeal:SEL:${d.id}`).row()
  }

  await ctx.reply(t('editdeal_select', lang), { reply_markup: kb })
}

export async function handleEditDealSelect(ctx: MyContext) {
  const callbackData = ctx.callbackQuery?.data
  if (!callbackData) return
  const dealId = callbackData.replace('editdeal:SEL:', '')
  const lang = ctx.session.language

  const deal = await prisma.deal.findFirst({
    where: { id: dealId, active: true },
    include: { business: { select: { telegramId: true } } },
  })

  if (!deal || deal.business.telegramId !== BigInt(ctx.from!.id)) {
    await ctx.answerCallbackQuery({ text: t('editdeal_not_found', lang), show_alert: true })
    return
  }

  const region = deal.targetCity ?? deal.targetCountry
  const detail = t('editdeal_detail', lang, {
    title: deal.title,
    expires: deal.expiresAt.toISOString().split('T')[0],
    region,
  })

  const kb = new InlineKeyboard()
    .text(t('editdeal_btn_deactivate', lang), `editdeal:OFF:${deal.id}`)
    .text(t('editdeal_btn_cancel', lang), 'editdeal:CANCEL')

  await ctx.editMessageText(detail, { reply_markup: kb, parse_mode: 'Markdown' })
  await ctx.answerCallbackQuery()
}

export async function handleEditDealDeactivate(ctx: MyContext) {
  const callbackData = ctx.callbackQuery?.data
  if (!callbackData) return
  const dealId = callbackData.replace('editdeal:OFF:', '')
  const lang = ctx.session.language

  const deal = await prisma.deal.findFirst({
    where: { id: dealId, active: true },
    include: { business: { select: { telegramId: true } } },
  })

  if (!deal || deal.business.telegramId !== BigInt(ctx.from!.id)) {
    await ctx.answerCallbackQuery({ text: t('editdeal_not_found', lang), show_alert: true })
    return
  }

  await prisma.deal.update({ where: { id: dealId }, data: { active: false } })
  await ctx.editMessageText(t('editdeal_deactivated', lang))
  await ctx.answerCallbackQuery()
}

export async function cmdMyDeals(ctx: MyContext) {
  const lang = ctx.session.language
  const biz = await prisma.business.findUnique({ where: { telegramId: BigInt(ctx.from!.id) } })
  if (!biz) { await ctx.reply(t('deal_not_approved', lang)); return }
  const deals = await prisma.deal.findMany({
    where: { businessId: biz.id, active: true, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })
  if (!deals.length) { await ctx.reply('You have no active deals.'); return }
  const lines = [`Your active deals (${deals.length}):`]
  for (const d of deals) lines.push(`\n• *${d.title}*\n  Expires: ${d.expiresAt.toISOString().split('T')[0]}\n  ID: \`${d.id}\``)
  await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' })
}
