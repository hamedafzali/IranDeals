import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  BOT_TOKEN: z.string().min(1),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  ADMIN_TELEGRAM_IDS: z.string().default(''),
  PUBLIC_CHANNEL_ID: z.string().optional(),
  // Set WEBHOOK_URL to enable webhook mode; omit for long-polling (development)
  WEBHOOK_URL: z.string().url().optional(),
  WEBHOOK_SECRET: z.string().optional(),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('7d'),
  API_PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Business rules
  MAX_DEALS_PER_WEEK: z.coerce.number().default(5),
  MAX_INSTANT_PER_DAY: z.coerce.number().default(3),
  MAX_DIGEST_DEALS: z.coerce.number().default(5),
  MAX_WEEKLY_DIGEST_DEALS: z.coerce.number().default(10),
  DEAL_DEFAULT_TTL_DAYS: z.coerce.number().default(30),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = parsed.data

export const ADMIN_IDS = new Set(
  config.ADMIN_TELEGRAM_IDS.split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(Number)
)
