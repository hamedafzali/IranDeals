import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import cron from 'node-cron'
import { webhookCallback } from 'grammy'
import { config } from './config/settings'
import { bot } from './bot/bot'
import { createServer } from './api/server'
import { sendDailyDigest, sendWeeklyDigest } from './bot/jobs/digest'
import { expireOldDeals, purgeInactiveSubscribers } from './bot/jobs/cleanup'

export const prisma = new PrismaClient()

const telegramCommands = [
  { command: 'start', description: 'Subscribe to deals' },
  { command: 'register', description: 'Register your business' },
  { command: 'newdeal', description: 'Post a new deal' },
  { command: 'mydeals', description: 'View your active deals' },
  { command: 'editdeal', description: 'Edit or deactivate a deal' },
  { command: 'deals', description: 'Browse current deals' },
  { command: 'settings', description: 'Manage preferences' },
  { command: 'language', description: 'Switch language' },
  { command: 'unsubscribe', description: 'Stop notifications' },
  { command: 'help', description: 'Show help' },
]

async function main() {
  // ── API server ──────────────────────────────────────────────────────────────
  const app = createServer()

  // ── Webhook mode (production) ───────────────────────────────────────────────
  if (config.WEBHOOK_URL) {
    const webhookPath = '/telegram-webhook'
    app.post(
      webhookPath,
      webhookCallback(bot, 'express', {
        secretToken: config.WEBHOOK_SECRET,
      }),
    )
    app.listen(config.API_PORT, async () => {
      console.log(`[api] listening on :${config.API_PORT}`)
      const webhookEndpoint = `${config.WEBHOOK_URL}${webhookPath}`
      await bot.api.setWebhook(webhookEndpoint, {
        secret_token: config.WEBHOOK_SECRET,
      })
      await bot.api.setMyCommands(telegramCommands)
      console.log(`[bot] webhook set → ${webhookEndpoint}`)
    })
  } else {
    // ── Long-polling mode (development) ────────────────────────────────────────
    app.listen(config.API_PORT, () => console.log(`[api] listening on :${config.API_PORT}`))
    await bot.api.deleteWebhook()
    await bot.api.setMyCommands(telegramCommands)
    await bot.api.setChatMenuButton({ menu_button: { type: 'commands' } })
    await bot.start({ onStart: info => console.log(`[bot] @${info.username} polling`) })
  }

  // ── Scheduler (both modes) ──────────────────────────────────────────────────
  cron.schedule('0 9 * * *',  () => sendDailyDigest().catch(console.error))
  cron.schedule('0 10 * * 0', () => sendWeeklyDigest().catch(console.error))
  cron.schedule('0 * * * *',  () => expireOldDeals().catch(console.error))
  cron.schedule('0 0 * * *',  () => purgeInactiveSubscribers().catch(console.error))
}

main().catch(err => { console.error(err); process.exit(1) })
