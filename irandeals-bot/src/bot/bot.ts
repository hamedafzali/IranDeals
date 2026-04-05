import { Bot, session, type Context, type SessionFlavor } from 'grammy'
import { Redis } from 'ioredis'
import { RedisAdapter } from '@grammyjs/storage-redis'
import { config } from '../config/settings'
import { detectLang } from './utils/i18n'
import { t } from './utils/i18n'

// ── Session ──────────────────────────────────────────────────────────────────

export interface SessionData {
  language: 'en' | 'fa'
  state: string
  flowData: Record<string, unknown>
}

export type MyContext = Context & SessionFlavor<SessionData>

// ── Bot instance ─────────────────────────────────────────────────────────────

export const bot = new Bot<MyContext>(config.BOT_TOKEN)

const redis = new Redis(config.REDIS_URL)
const storage = new RedisAdapter<SessionData>({ instance: redis })

bot.use(session({
  initial: (): SessionData => ({ language: 'en', state: 'IDLE', flowData: {} }),
  storage,
}))

// Auto-detect language on first contact
bot.use(async (ctx, next) => {
  if (ctx.session.state === 'IDLE' && ctx.from?.language_code) {
    ctx.session.language = detectLang(ctx.from.language_code)
  }
  await next()
})

// ── Handlers import ───────────────────────────────────────────────────────────

import { cmdStart, handleSubscribeAction, handleSubCitySearch, handleSubCityToggle, handleSubCityRemove, handleSubCityDone, handleSubCategoryToggle, handleSubCategoriesDone, handleSubFrequency } from './handlers/start'
import { cmdRegister, handleRegName, handleRegCitySearch, handleRegCitySelect, handleRegCategory, handleRegPhone, handleRegWebsite, handleRegInstagram, handleRegConfirm } from './handlers/register'
import { cmdNewDeal, handleDealTitle, handleDealDesc, handleDealExpiry, handleDealExpiryCustom, handleDealImage, handleDealRegion, handleDealConfirm, cmdMyDeals, cmdEditDeal, handleEditDealSelect, handleEditDealDeactivate } from './handlers/newdeal'
import { cmdSettings, handleSettingsCities, handleSettingsCategories, handleSettingsFrequency, handleSettingsFreqDone, handleSettingsCatDone, cmdLanguage, cmdUnsubscribe } from './handlers/settings'
import { cmdDeals } from './handlers/browse'
import { cmdAdmin, cmdPending, cmdStats, cmdApprove, cmdReject, cmdBan, cmdBroadcast, handleBroadcastMessage, handleBroadcastConfirm, handleAdminAction } from './handlers/admin'
import { handleReportDeal } from './handlers/report'

// ── Commands ──────────────────────────────────────────────────────────────────

bot.command('start', cmdStart)
bot.command('register', cmdRegister)
bot.command('newdeal', cmdNewDeal)
bot.command('mydeals', cmdMyDeals)
bot.command('editdeal', cmdEditDeal)
bot.command('deals', cmdDeals)
bot.command('settings', cmdSettings)
bot.command('language', cmdLanguage)
bot.command('unsubscribe', cmdUnsubscribe)
bot.command('admin', cmdAdmin)
bot.command('pending', cmdPending)
bot.command('stats', cmdStats)
bot.command('approve', cmdApprove)
bot.command('reject', cmdReject)
bot.command('ban', cmdBan)
bot.command('broadcast', cmdBroadcast)
bot.command('help', ctx => ctx.reply(t('help_text', ctx.session.language)))

// ── Text message dispatcher ───────────────────────────────────────────────────

bot.on('message:text', async (ctx) => {
  const { state } = ctx.session
  if (state === 'ADMIN_BROADCAST_MSG')  return handleBroadcastMessage(ctx)
  if (state === 'SUB_CITY' || state === 'SETTINGS_CITY') return handleSubCitySearch(ctx)
  if (state === 'REG_NAME')           return handleRegName(ctx)
  if (state === 'REG_CITY')           return handleRegCitySearch(ctx)
  if (state === 'REG_PHONE')          return handleRegPhone(ctx)
  if (state === 'REG_WEBSITE')        return handleRegWebsite(ctx)
  if (state === 'REG_INSTAGRAM')      return handleRegInstagram(ctx)
  if (state === 'DEAL_TITLE')         return handleDealTitle(ctx)
  if (state === 'DEAL_DESC')          return handleDealDesc(ctx)
  if (state === 'DEAL_EXPIRY_CUSTOM') return handleDealExpiryCustom(ctx)
  if (state === 'DEAL_IMAGE')         return handleDealImage(ctx)
})

// ── Photo dispatcher ──────────────────────────────────────────────────────────

bot.on('message:photo', async (ctx) => {
  if (ctx.session.state === 'DEAL_IMAGE') return handleDealImage(ctx)
})

// ── Callback query dispatcher ─────────────────────────────────────────────────

bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data
  const { state } = ctx.session

  if (data === 'action:subscribe')    return handleSubscribeAction(ctx)
  if (data === 'action:register')     return cmdRegister(ctx)
  if (data === 'action:done') {
    if (state === 'SUB_CITY' || state === 'SETTINGS_CITY') return handleSubCityDone(ctx)
    if (state === 'SUB_CATEGORIES')   return handleSubCategoriesDone(ctx)
    if (state === 'REG_CATEGORY')     return handleRegCategory(ctx)
    if (state === 'SETTINGS_CATEGORIES') return handleSettingsCatDone(ctx)
  }
  if (data.startsWith('city:'))       return state === 'REG_CITY' ? handleRegCitySelect(ctx) : handleSubCityToggle(ctx)
  if (data.startsWith('city_remove:')) return handleSubCityRemove(ctx)
  if (data.startsWith('cat:')) {
    if (state === 'REG_CATEGORY')     return handleRegCategory(ctx)
    return handleSubCategoryToggle(ctx)
  }
  if (data.startsWith('confirm:')) {
    if (state === 'REG_CONFIRM')      return handleRegConfirm(ctx)
    if (state === 'DEAL_CONFIRM')     return handleDealConfirm(ctx)
  }
  if (data.startsWith('expiry:'))     return handleDealExpiry(ctx)
  if (data.startsWith('region:'))     return handleDealRegion(ctx)
  if (data.startsWith('freq:')) {
    if (state === 'SUB_FREQUENCY')    return handleSubFrequency(ctx)
    if (state === 'SETTINGS_FREQUENCY') return handleSettingsFreqDone(ctx)
  }
  if (data.startsWith('settings:')) {
    if (data === 'settings:cities')      return handleSettingsCities(ctx)
    if (data === 'settings:categories')  return handleSettingsCategories(ctx)
    if (data === 'settings:frequency')   return handleSettingsFrequency(ctx)
  }
  if (data.startsWith('editdeal:SEL:'))  return handleEditDealSelect(ctx)
  if (data.startsWith('editdeal:OFF:'))  return handleEditDealDeactivate(ctx)
  if (data === 'editdeal:CANCEL')        return ctx.editMessageText('↩️').then(() => ctx.answerCallbackQuery())
  if (data.startsWith('admin:'))         return handleAdminAction(ctx)
  if (data.startsWith('report:'))        return handleReportDeal(ctx)
  if (data.startsWith('broadcast:'))     return handleBroadcastConfirm(ctx)
})

bot.catch(err => console.error('[bot error]', err))
