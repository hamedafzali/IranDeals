import { Router } from 'express'
import { prisma } from '../../index'

const router = Router()

router.get('/', async (req, res) => {
  const { page = '1', limit = '20', active, country } = req.query as Record<string, string>
  const skip = (parseInt(page) - 1) * parseInt(limit)
  const where = {
    ...(active !== undefined ? { active: active === 'true' } : {}),
    ...(country ? { targetCountry: country } : {}),
  }
  const [data, total] = await Promise.all([
    prisma.deal.findMany({ where, skip, take: parseInt(limit), include: { business: true }, orderBy: { createdAt: 'desc' } }),
    prisma.deal.count({ where }),
  ])
  res.json({ data, total, page: parseInt(page), limit: parseInt(limit) })
})

router.get('/:id', async (req, res) => {
  const d = await prisma.deal.findUnique({ where: { id: req.params.id }, include: { business: true, deliveries: true } })
  if (!d) { res.status(404).json({ error: 'Not found' }); return }
  res.json(d)
})

router.put('/:id', async (req, res) => {
  const d = await prisma.deal.update({ where: { id: req.params.id }, data: req.body })
  res.json(d)
})

router.delete('/:id', async (req, res) => {
  await prisma.deal.update({ where: { id: req.params.id }, data: { active: false } })
  res.json({ ok: true })
})

router.post('/:id/activate', async (req, res) => {
  const d = await prisma.deal.update({ where: { id: req.params.id }, data: { active: true } })
  res.json(d)
})

router.post('/:id/deactivate', async (req, res) => {
  const d = await prisma.deal.update({ where: { id: req.params.id }, data: { active: false } })
  res.json(d)
})

export default router
