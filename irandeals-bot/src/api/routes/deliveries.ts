import { Router } from 'express'
import { prisma } from '../../index'

const router = Router()

router.get('/', async (req, res) => {
  const { page = '1', limit = '20', channel } = req.query as Record<string, string>
  const skip = (parseInt(page) - 1) * parseInt(limit)
  const where = channel ? { channel } : {}
  const [data, total] = await Promise.all([
    prisma.dealDelivery.findMany({ where, skip, take: parseInt(limit), include: { deal: { select: { title: true } } }, orderBy: { sentAt: 'desc' } }),
    prisma.dealDelivery.count({ where }),
  ])
  res.json({ data, total, page: parseInt(page) })
})

export default router
