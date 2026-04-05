import type { MyContext } from '../bot'
import { t } from '../utils/i18n'
import { adminBusinessKeyboard, broadcastConfirmKeyboard } from '../utils/keyboards'
import { formatBusinessCard } from '../utils/formatting'
import { prisma } from '../../index'
import { ADMIN_IDS } from '../../config/settings'
import { bot } from '../bot'

function isAdmin(id: number) { return ADMIN_IDS.has(id) }

export async function cmdAdmin(ctx: MyContext) {
  if (!isAdmin(ctx.from!.id)) { await ctx.reply(t('admin_not_authorized')); return }
  await ctx.reply(t('admin_menu'))
}

export async function cmdPending(ctx: MyContext) {
  if (!isAdmin(ctx.from!.id)) { await ctx.reply(t('admin_not_authorized')); return }
  const businesses = await prisma.business.findMany({ where: { status: 'pending' }, orderBy: { createdAt: 'asc' } })
  if (!businesses.length) { await ctx.reply(t('admin_no_pending')); return }
  for (const b of businesses) {
    await ctx.reply(formatBusinessCard(b), { reply_markup: adminBusinessKeyboard(b.id), parse_mode: 'Markdown' })
  }
}

export async function cmdStats(ctx: MyContext) {
  if (!isAdmin(ctx.from!.id)) { await ctx.reply(t('admin_not_authorized')); return }
  const [businesses, subscribers, deals] = await Promise.all([
    prisma.business.count(),
    prisma.subscriber.count({ where: { active: true } }),
    prisma.deal.count({ where: { active: true, expiresAt: { gt: new Date() } } }),
  ])
  await ctx.reply(t('admin_stats', 'en', { businesses, subscribers, deals }))
}

// ── /approve <id> ─────────────────────────────────────────────────────────────

export async function cmdApprove(ctx: MyContext) {
  if (!isAdmin(ctx.from!.id)) { await ctx.reply(t('admin_not_authorized')); return }
  const id = ctx.match as string | undefined
  if (!id?.trim()) { await ctx.reply('Usage: /approve <business_id>'); return }
  const business = await prisma.business.findUnique({ where: { id: id.trim() } })
  if (!business) { await ctx.reply(t('admin_not_found', 'en', { id: id.trim() }), { parse_mode: 'Markdown' }); return }
  await prisma.business.update({ where: { id: business.id }, data: { status: 'approved', approvedAt: new Date() } })
  await prisma.adminLog.create({ data: { adminTelegramId: BigInt(ctx.from!.id), action: 'approve', targetType: 'business', targetId: business.id } })
  await ctx.reply(t('admin_approved', 'en', { name: business.name }), { parse_mode: 'Markdown' })
  await bot.api.sendMessage(Number(business.telegramId), t('reg_approved_notification')).catch(() => {})
}

// ── /reject <id> [reason] ─────────────────────────────────────────────────────

export async function cmdReject(ctx: MyContext) {
  if (!isAdmin(ctx.from!.id)) { await ctx.reply(t('admin_not_authorized')); return }
  const args = (ctx.match as string | undefined)?.trim() ?? ''
  const [id, ...rest] = args.split(' ')
  if (!id) { await ctx.reply('Usage: /reject <business_id> [reason]'); return }
  const reason = rest.join(' ') || 'Does not meet community standards.'
  const business = await prisma.business.findUnique({ where: { id } })
  if (!business) { await ctx.reply(t('admin_not_found', 'en', { id }), { parse_mode: 'Markdown' }); return }
  await prisma.business.update({ where: { id }, data: { status: 'rejected' } })
  await prisma.adminLog.create({ data: { adminTelegramId: BigInt(ctx.from!.id), action: 'reject', targetType: 'business', targetId: id, note: reason } })
  await ctx.reply(t('admin_rejected', 'en', { name: business.name }), { parse_mode: 'Markdown' })
  await bot.api.sendMessage(Number(business.telegramId), t('reg_rejected_notification', 'en', { reason })).catch(() => {})
}

// ── /ban <id> ─────────────────────────────────────────────────────────────────

export async function cmdBan(ctx: MyContext) {
  if (!isAdmin(ctx.from!.id)) { await ctx.reply(t('admin_not_authorized')); return }
  const id = (ctx.match as string | undefined)?.trim()
  if (!id) { await ctx.reply('Usage: /ban <business_id>'); return }
  const business = await prisma.business.findUnique({ where: { id } })
  if (!business) { await ctx.reply(t('admin_not_found', 'en', { id }), { parse_mode: 'Markdown' }); return }
  await prisma.business.update({ where: { id }, data: { status: 'banned' } })
  await prisma.adminLog.create({ data: { adminTelegramId: BigInt(ctx.from!.id), action: 'ban', targetType: 'business', targetId: id } })
  await ctx.reply(t('admin_banned', 'en', { name: business.name }), { parse_mode: 'Markdown' })
}

// ── /broadcast ────────────────────────────────────────────────────────────────

export async function cmdBroadcast(ctx: MyContext) {
  if (!isAdmin(ctx.from!.id)) { await ctx.reply(t('admin_not_authorized')); return }
  ctx.session.state = 'ADMIN_BROADCAST_MSG'
  ctx.session.flowData = {}
  await ctx.reply(t('admin_broadcast_prompt'))
}

export async function handleBroadcastMessage(ctx: MyContext) {
  if (!isAdmin(ctx.from!.id)) { ctx.session.state = 'IDLE'; return }
  const message = ctx.message?.text ?? ''
  if (!message) { await ctx.reply(t('error_invalid_input')); return }
  const count = await prisma.subscriber.count({ where: { active: true } })
  ctx.session.flowData = { broadcastMessage: message }
  ctx.session.state = 'ADMIN_BROADCAST_CONFIRM'
  await ctx.reply(
    t('admin_broadcast_confirm', 'en', { count, message }),
    { reply_markup: broadcastConfirmKeyboard(), parse_mode: 'Markdown' },
  )
}

export async function handleBroadcastConfirm(ctx: MyContext) {
  if (!isAdmin(ctx.from!.id)) { await ctx.answerCallbackQuery(); return }
  const action = (ctx.callbackQuery?.data ?? '').replace('broadcast:', '')
  ctx.session.state = 'IDLE'

  if (action === 'cancel') {
    await ctx.editMessageText(t('admin_broadcast_cancelled'))
    await ctx.answerCallbackQuery()
    return
  }

  const message = ctx.session.flowData?.broadcastMessage as string | undefined
  if (!message) { await ctx.answerCallbackQuery(); return }

  await ctx.editMessageText('⏳ Sending...')
  await ctx.answerCallbackQuery()

  const subscribers = await prisma.subscriber.findMany({ where: { active: true }, select: { telegramId: true } })
  let sent = 0
  for (const sub of subscribers) {
    try {
      await bot.api.sendMessage(Number(sub.telegramId), message)
      sent++
    } catch {
      // subscriber may have blocked the bot — skip silently
    }
  }
  await ctx.reply(t('admin_broadcast_sent', 'en', { count: sent }))
  ctx.session.flowData = {}
}

// ── Inline button actions (/pending flow) ─────────────────────────────────────

export async function handleAdminAction(ctx: MyContext) {
  if (!isAdmin(ctx.from!.id)) { await ctx.answerCallbackQuery({ text: t('admin_not_authorized'), show_alert: true }); return }
  const parts = (ctx.callbackQuery?.data ?? '').split(':')
  const [, action, businessId] = parts
  const statusMap: Record<string, string> = { approve: 'approved', reject: 'rejected', ban: 'banned' }
  const newStatus = statusMap[action]
  if (!newStatus || !businessId) { await ctx.answerCallbackQuery(); return }

  const business = await prisma.business.update({
    where: { id: businessId },
    data: { status: newStatus, ...(newStatus === 'approved' ? { approvedAt: new Date() } : {}) },
  })
  await prisma.adminLog.create({
    data: { adminTelegramId: BigInt(ctx.from!.id), action, targetType: 'business', targetId: businessId },
  })
  await ctx.editMessageText(t(`admin_${action}d` as any, 'en', { name: business.name }), { parse_mode: 'Markdown' })
  await ctx.answerCallbackQuery()

  const notifyKey = action === 'approve' ? 'reg_approved_notification' : action === 'reject' ? 'reg_rejected_notification' : null
  if (notifyKey) {
    await ctx.api.sendMessage(Number(business.telegramId), t(notifyKey as any, 'en', { reason: 'Does not meet community standards.' })).catch(() => {})
  }
}
