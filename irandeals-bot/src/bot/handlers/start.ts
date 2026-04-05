import type { MyContext } from '../bot'
import { t } from '../utils/i18n'
import {
  mainMenuKeyboard, citySearchResultsKeyboard,
  selectedCitiesKeyboard, categoryKeyboard, frequencyKeyboard,
} from '../utils/keyboards'
import { searchCities } from '../utils/validators'
import { prisma } from '../../index'

export async function cmdStart(ctx: MyContext) {
  const lang = ctx.session.language
  const sub = await prisma.subscriber.findUnique({ where: { telegramId: BigInt(ctx.from!.id) } })
  if (sub?.active) {
    await ctx.reply(t('sub_already', lang))
    return
  }
  ctx.session.state = 'IDLE'
  ctx.session.flowData = {}
  await ctx.reply(`${t('welcome_title', lang)}\n\n${t('welcome_body', lang)}`, {
    reply_markup: mainMenuKeyboard(),
  })
}

export async function handleSubscribeAction(ctx: MyContext) {
  const lang = ctx.session.language
  ctx.session.state = 'SUB_CITY'
  ctx.session.flowData = { cities: [] }
  await ctx.editMessageText(
    lang === 'fa' ? 'نام شهر خود را تایپ کنید:\nانتخاب شده: —' : 'Type a city name to search:\nCurrently selected: —'
  )
}

export async function handleSubCitySearch(ctx: MyContext) {
  const lang = ctx.session.language
  const query = ctx.message?.text?.trim() ?? ''
  const supported = await getSupportedCities()
  const results = searchCities(query, supported)
  const cities: string[] = ctx.session.flowData.cities as string[] ?? []
  if (!results.length) {
    await ctx.reply(lang === 'fa' ? 'شهری یافت نشد. دوباره امتحان کنید.' : `No cities found for "${query}".`)
    return
  }
  await ctx.reply(
    lang === 'fa' ? 'شهر را انتخاب کنید:' : 'Select a city:',
    { reply_markup: citySearchResultsKeyboard(results, cities, true) }
  )
}

export async function handleSubCityToggle(ctx: MyContext) {
  const lang = ctx.session.language
  const payload = (ctx.callbackQuery?.data ?? '').replace('city:', '')
  const [city] = payload.split('|')
  const cities: string[] = (ctx.session.flowData.cities as string[]) ?? []
  const idx = cities.indexOf(city)
  idx >= 0 ? cities.splice(idx, 1) : cities.push(city)
  ctx.session.flowData.cities = cities
  const selected = cities.join(', ') || '—'
  const prompt = lang === 'fa' ? `نام شهر را تایپ کنید:\nانتخاب شده: ${selected}` : `Type a city name to search:\nCurrently selected: ${selected}`
  await ctx.editMessageText(prompt, { reply_markup: cities.length ? selectedCitiesKeyboard(cities) : undefined })
  await ctx.answerCallbackQuery()
}

export async function handleSubCityRemove(ctx: MyContext) {
  const city = (ctx.callbackQuery?.data ?? '').replace('city_remove:', '')
  const cities: string[] = (ctx.session.flowData.cities as string[]) ?? []
  const idx = cities.indexOf(city)
  if (idx >= 0) cities.splice(idx, 1)
  ctx.session.flowData.cities = cities
  const lang = ctx.session.language
  const selected = cities.join(', ') || '—'
  const prompt = lang === 'fa' ? `نام شهر را تایپ کنید:\nانتخاب شده: ${selected}` : `Type a city name:\nCurrently selected: ${selected}`
  await ctx.editMessageText(prompt, { reply_markup: cities.length ? selectedCitiesKeyboard(cities) : undefined })
  await ctx.answerCallbackQuery()
}

export async function handleSubCityDone(ctx: MyContext) {
  const cities = (ctx.session.flowData.cities as string[]) ?? []
  const lang = ctx.session.language
  if (!cities.length) {
    await ctx.answerCallbackQuery({
      text: lang === 'fa' ? 'حداقل یک شهر انتخاب کنید.' : 'Please select at least one city.',
      show_alert: true,
    })
    return
  }
  ctx.session.state = 'SUB_CATEGORIES'
  ctx.session.flowData.categories = []
  await ctx.editMessageText(t('sub_prompt_categories', lang), { reply_markup: categoryKeyboard() })
  await ctx.answerCallbackQuery()
}

export async function handleSubCategoryToggle(ctx: MyContext) {
  const cat = (ctx.callbackQuery?.data ?? '').replace('cat:', '')
  const cats: string[] = (ctx.session.flowData.categories as string[]) ?? []
  const idx = cats.indexOf(cat)
  idx >= 0 ? cats.splice(idx, 1) : cats.push(cat)
  ctx.session.flowData.categories = cats
  await ctx.editMessageReplyMarkup({ reply_markup: categoryKeyboard(cats) })
  await ctx.answerCallbackQuery()
}

export async function handleSubCategoriesDone(ctx: MyContext) {
  const cats = (ctx.session.flowData.categories as string[]) ?? []
  const lang = ctx.session.language
  if (!cats.length) {
    await ctx.answerCallbackQuery({
      text: lang === 'fa' ? 'حداقل یک دسته انتخاب کنید.' : 'Please select at least one category.',
      show_alert: true,
    })
    return
  }
  ctx.session.state = 'SUB_FREQUENCY'
  await ctx.editMessageText(t('sub_prompt_frequency', lang), { reply_markup: frequencyKeyboard() })
  await ctx.answerCallbackQuery()
}

export async function handleSubFrequency(ctx: MyContext) {
  const frequency = (ctx.callbackQuery?.data ?? '').replace('freq:', '') as 'instant' | 'daily' | 'weekly'
  const lang = ctx.session.language
  const tid = BigInt(ctx.from!.id)
  const { cities, categories } = ctx.session.flowData as { cities: string[]; categories: string[] }
  await prisma.subscriber.upsert({
    where: { telegramId: tid },
    update: { cities, categories, frequency, language: lang, active: true },
    create: { telegramId: tid, cities, categories, frequency, language: lang },
  })
  ctx.session.state = 'IDLE'
  ctx.session.flowData = {}
  await ctx.editMessageText(t('sub_done', lang))
  await ctx.answerCallbackQuery()
}

// Shared helper
export async function getSupportedCities(): Promise<Record<string, string[]>> {
  const cities = await prisma.city.findMany({ where: { active: true }, include: { country: true } })
  const out: Record<string, string[]> = {}
  for (const c of cities) {
    if (!c.country.active) continue
    ;(out[c.country.name] ??= []).push(c.name)
  }
  return out
}
