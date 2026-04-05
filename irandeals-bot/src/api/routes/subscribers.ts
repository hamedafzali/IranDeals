import { Router } from 'express'
import { prisma } from '../../index'

const router = Router()

router.get('/', async (req, res) => {
  const { page = '1', limit = '20', active, frequency } = req.query as Record<string, string>
  const skip = (parseInt(page) - 1) * parseInt(limit)
  const where = {
    ...(active !== undefined ? { active: active === 'true' } : {}),
    ...(frequency ? { frequency } : {}),
  }
  const [data, total] = await Promise.all([
    prisma.subscriber.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
    prisma.subscriber.count({ where }),
  ])
  res.json({ data, total, page: parseInt(page) })
})

router.get('/:id', async (req, res) => {
  const s = await prisma.subscriber.findUnique({ where: { id: req.params.id } })
  if (!s) { res.status(404).json({ error: 'Not found' }); return }
  res.json(s)
})

router.post('/:id/deactivate', async (req, res) => {
  const s = await prisma.subscriber.update({ where: { id: req.params.id }, data: { active: false } })
  res.json(s)
})

export default router
