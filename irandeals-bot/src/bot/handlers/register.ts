import type { MyContext } from '../bot'
import { t } from '../utils/i18n'
import { categoryKeyboard, citySearchResultsKeyboard, confirmKeyboard, adminBusinessKeyboard } from '../utils/keyboards'
import { isValidPhone, isValidUrl, searchCities } from '../utils/validators'
import { formatBusinessCard } from '../utils/formatting'
import { prisma } from '../../index'
import { ADMIN_IDS } from '../../config/settings'
import { getSupportedCities } from './start'

export async function cmdRegister(ctx: MyContext) {
  const lang = ctx.session.language
  const existing = await prisma.business.findUnique({ where: { telegramId: BigInt(ctx.from!.id) } })
  if (existing) { await ctx.reply(t('reg_already_registered', lang, { status: existing.status })); return }
  ctx.session.state = 'REG_NAME'
  ctx.session.flowData = {}
  await ctx.reply(t('reg_prompt_name', lang))
}

export async function handleRegName(ctx: MyContext) {
  const lang = ctx.session.language
  ctx.session.flowData.name = ctx.message?.text?.trim().slice(0, 200)
  ctx.session.state = 'REG_CITY'
  await ctx.reply(lang === 'fa' ? 'نام شهر کسب‌وکار خود را تایپ کنید:' : 'Type your business city name to search:')
}

export async function handleRegCitySearch(ctx: MyContext) {
  const lang = ctx.session.language
  const supported = await getSupportedCities()
  const results = searchCities(ctx.message?.text?.trim() ?? '', supported)
  if (!results.length) { await ctx.reply(lang === 'fa' ? 'شهری یافت نشد.' : 'No cities found.'); return }
  await ctx.reply(t('reg_prompt_city', lang), { reply_markup: citySearchResultsKeyboard(results, [], false) })
}

export async function handleRegCitySelect(ctx: MyContext) {
  const payload = (ctx.callbackQuery?.data ?? '').replace('city:', '')
  const [city, country] = payload.split('|')
  ctx.session.flowData.city = city
  ctx.session.flowData.country = country
  ctx.session.state = 'REG_CATEGORY'
  const lang = ctx.session.language
  await ctx.editMessageText(t('reg_prompt_category', lang), { reply_markup: categoryKeyboard() })
  await ctx.answerCallbackQuery()
}

export async function handleRegCategory(ctx: MyContext) {
  const data = ctx.callbackQuery?.data ?? ''
  const lang = ctx.session.language
  if (data === 'action:done') {
    if (!ctx.session.flowData.category) { await ctx.answerCallbackQuery({ text: 'Please select a category.', show_alert: true }); return }
    ctx.session.state = 'REG_PHONE'
    await ctx.editMessageText(t('reg_prompt_phone', lang))
    await ctx.answerCallbackQuery()
    return
  }
  const cat = data.replace('cat:', '')
  ctx.session.flowData.category = cat
  await ctx.editMessageReplyMarkup({ reply_markup: categoryKeyboard([cat]) })
  await ctx.answerCallbackQuery()
}

export async function handleRegPhone(ctx: MyContext) {
  const text = ctx.message?.text?.trim() ?? ''
  const lang = ctx.session.language
  if (['/skip', 'skip'].includes(text.toLowerCase())) {
    ctx.session.flowData.phone = null
  } else if (isValidPhone(text)) {
    ctx.session.flowData.phone = text
  } else {
    await ctx.reply(t('error_invalid_input', lang)); return
  }
  ctx.session.state = 'REG_WEBSITE'
  await ctx.reply(t('reg_prompt_website', lang))
}

export async function handleRegWebsite(ctx: MyContext) {
  const text = ctx.message?.text?.trim() ?? ''
  const lang = ctx.session.language
  if (['/skip', 'skip'].includes(text.toLowerCase())) {
    ctx.session.flowData.website = null
  } else if (isValidUrl(text)) {
    ctx.session.flowData.website = text
  } else {
    await ctx.reply(t('error_invalid_input', lang)); return
  }
  ctx.session.state = 'REG_INSTAGRAM'
  await ctx.reply(t('reg_prompt_instagram', lang))
}

export async function handleRegInstagram(ctx: MyContext) {
  const text = ctx.message?.text?.trim() ?? ''
  ctx.session.flowData.instagram = ['/skip', 'skip'].includes(text.toLowerCase()) ? null : text.replace(/^@/, '').slice(0, 100)
  ctx.session.state = 'REG_CONFIRM'
  const lang = ctx.session.language
  const d = ctx.session.flowData as Record<string, string | null>
  const prompt = t('reg_confirm_prompt', lang, {
    name: d.name ?? '', city: d.city ?? '', country: d.country ?? '',
    category: d.category ?? '', phone: d.phone ?? '—',
    website: d.website ?? '—', instagram: d.instagram ?? '—',
  })
  await ctx.reply(prompt, { reply_markup: confirmKeyboard() })
}

export async function handleRegConfirm(ctx: MyContext) {
  const answer = (ctx.callbackQuery?.data ?? '').replace('confirm:', '')
  const lang = ctx.session.language
  if (answer === 'edit') {
    ctx.session.state = 'REG_NAME'
    ctx.session.flowData = {}
    await ctx.editMessageText(t('reg_prompt_name', lang))
    await ctx.answerCallbackQuery()
    return
  }
  const d = ctx.session.flowData as Record<string, string | null>
  const business = await prisma.business.create({
    data: {
      telegramId: BigInt(ctx.from!.id),
      name: d.name!, country: d.country!, city: d.city!,
      category: d.category!, phone: d.phone, website: d.website, instagram: d.instagram,
    },
  })
  ctx.session.state = 'IDLE'
  ctx.session.flowData = {}
  await ctx.editMessageText(t('reg_submitted', lang))
  await ctx.answerCallbackQuery()

  // Notify admins
  const card = formatBusinessCard(business)
  for (const adminId of ADMIN_IDS) {
    await ctx.api.sendMessage(adminId, `📋 New business registration:\n\n${card}`, {
      reply_markup: adminBusinessKeyboard(business.id),
      parse_mode: 'Markdown',
    }).catch(() => {})
  }
}
