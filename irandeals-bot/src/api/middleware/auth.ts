import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../../config/settings'

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return }
  try {
    const payload = jwt.verify(header.slice(7), config.JWT_SECRET)
    ;(req as any).admin = payload
    next()
  } catch { res.status(401).json({ error: 'Invalid token' }) }
}
