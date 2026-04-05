import type { MyContext } from '../bot'
import { t } from '../utils/i18n'
import { categoryKeyboard, frequencyKeyboard, selectedCitiesKeyboard } from '../utils/keyboards'
import { prisma } from '../../index'
import { InlineKeyboard } from 'grammy'

export async function cmdSettings(ctx: MyContext) {
  const lang = ctx.session.language
  const sub = await prisma.subscriber.findUnique({ where: { telegramId: BigInt(ctx.from!.id) } })
  if (!sub?.active) { await ctx.reply("You're not subscribed. Use /start to subscribe."); return }
  const menu = t('settings_menu', sub.language as 'en' | 'fa', {
    cities: sub.cities.join(', ') || '—',
    categories: sub.categories.join(', ') || '—',
    frequency: sub.frequency,
    language: sub.language === 'fa' ? 'فارسی' : 'English',
  })
  const kb = new InlineKeyboard()
    .text('📍 Update cities', 'settings:cities').row()
    .text('🏷 Update categories', 'settings:categories').row()
    .text('🔔 Update frequency', 'settings:frequency')
  await ctx.reply(menu, { reply_markup: kb })
}

export async function handleSettingsCities(ctx: MyContext) {
  const lang = ctx.session.language
  const sub = await prisma.subscriber.findUnique({ where: { telegramId: BigInt(ctx.from!.id) } })
  const current = sub?.cities ?? []
  ctx.session.state = 'SETTINGS_CITY'
  ctx.session.flowData = { cities: current }
  const selected = current.join(', ') || '—'
  const prompt = lang === 'fa' ? `نام شهر را تایپ کنید:\nانتخاب شده: ${selected}` : `Type a city name:\nCurrently selected: ${selected}`
  await ctx.editMessageText(prompt, { reply_markup: current.length ? selectedCitiesKeyboard(current) : undefined })
  await ctx.answerCallbackQuery()
}

export async function handleSettingsCategories(ctx: MyContext) {
  const lang = ctx.session.language
  const sub = await prisma.subscriber.findUnique({ where: { telegramId: BigInt(ctx.from!.id) } })
  const current = sub?.categories ?? []
  ctx.session.state = 'SETTINGS_CATEGORIES'
  ctx.session.flowData = { categories: current }
  await ctx.editMessageText(t('sub_prompt_categories', lang), { reply_markup: categoryKeyboard(current) })
  await ctx.answerCallbackQuery()
}

export async function handleSettingsFrequency(ctx: MyContext) {
  const lang = ctx.session.language
  ctx.session.state = 'SETTINGS_FREQUENCY'
  await ctx.editMessageText(t('sub_prompt_frequency', lang), { reply_markup: frequencyKeyboard() })
  await ctx.answerCallbackQuery()
}

export async function handleSettingsFreqDone(ctx: MyContext) {
  const frequency = (ctx.callbackQuery?.data ?? '').replace('freq:', '')
  await prisma.subscriber.update({ where: { telegramId: BigInt(ctx.from!.id) }, data: { frequency } })
  ctx.session.state = 'IDLE'
  await ctx.editMessageText(t('settings_updated', ctx.session.language))
  await ctx.answerCallbackQuery()
}

export async function handleSettingsCatDone(ctx: MyContext) {
  const cats = (ctx.session.flowData.categories as string[]) ?? []
  if (!cats.length) { await ctx.answerCallbackQuery({ text: 'Please select at least one category.', show_alert: true }); return }
  await prisma.subscriber.update({ where: { telegramId: BigInt(ctx.from!.id) }, data: { categories: cats } })
  ctx.session.state = 'IDLE'
  ctx.session.flowData = {}
  await ctx.editMessageText(t('settings_updated', ctx.session.language))
  await ctx.answerCallbackQuery()
}

export async function cmdLanguage(ctx: MyContext) {
  const newLang = ctx.session.language === 'en' ? 'fa' : 'en'
  ctx.session.language = newLang
  await prisma.subscriber.updateMany({ where: { telegramId: BigInt(ctx.from!.id) }, data: { language: newLang } })
  await ctx.reply(t('language_switched', newLang))
}

export async function cmdUnsubscribe(ctx: MyContext) {
  const lang = ctx.session.language
  await prisma.subscriber.updateMany({ where: { telegramId: BigInt(ctx.from!.id) }, data: { active: false } })
  await ctx.reply(t('sub_unsubscribed', lang))
}
