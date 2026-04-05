import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { authMiddleware } from './middleware/auth'
import { errorHandler } from './middleware/errorHandler'
import authRouter from './routes/auth'
import businessesRouter from './routes/businesses'
import dealsRouter from './routes/deals'
import subscribersRouter from './routes/subscribers'
import locationsRouter from './routes/locations'
import analyticsRouter from './routes/analytics'
import deliveriesRouter from './routes/deliveries'

export function createServer() {
  const app = express()

  app.set('json replacer', (_key: string, value: unknown) =>
    typeof value === 'bigint' ? value.toString() : value
  )

  app.use(helmet())
  app.use(cors({ origin: process.env.ADMIN_ORIGIN ?? '*', credentials: true }))
  app.use(express.json())
  app.use(rateLimit({ windowMs: 60_000, max: 200 }))

  // Public
  app.use('/api/auth', authRouter)

  // Protected
  app.use('/api/businesses', authMiddleware, businessesRouter)
  app.use('/api/deals',      authMiddleware, dealsRouter)
  app.use('/api/subscribers',authMiddleware, subscribersRouter)
  app.use('/api/locations',  authMiddleware, locationsRouter)
  app.use('/api/analytics',  authMiddleware, analyticsRouter)
  app.use('/api/deliveries', authMiddleware, deliveriesRouter)

  app.get('/health', (_req, res) => res.json({ ok: true }))

  app.use(errorHandler)
  return app
}
