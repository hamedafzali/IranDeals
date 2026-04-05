import { Router } from 'express'
import { prisma } from '../../index'

const router = Router()

// Countries
router.get('/countries', async (_req, res) => {
  res.json(await prisma.country.findMany({ include: { cities: true }, orderBy: { name: 'asc' } }))
})
router.post('/countries', async (req, res) => {
  const c = await prisma.country.create({ data: req.body })
  res.status(201).json(c)
})
router.put('/countries/:id', async (req, res) => {
  const c = await prisma.country.update({ where: { id: parseInt(req.params.id) }, data: req.body })
  res.json(c)
})
router.delete('/countries/:id', async (req, res) => {
  await prisma.country.update({ where: { id: parseInt(req.params.id) }, data: { active: false } })
  res.json({ ok: true })
})

// Cities
router.get('/cities', async (req, res) => {
  const { countryId } = req.query as Record<string, string>
  const cities = await prisma.city.findMany({
    where: { ...(countryId ? { countryId: parseInt(countryId) } : {}), active: true },
    include: { country: true },
    orderBy: { name: 'asc' },
  })
  res.json(cities)
})
router.post('/cities', async (req, res) => {
  const c = await prisma.city.create({ data: req.body })
  res.status(201).json(c)
})
router.put('/cities/:id', async (req, res) => {
  const c = await prisma.city.update({ where: { id: parseInt(req.params.id) }, data: req.body })
  res.json(c)
})
router.delete('/cities/:id', async (req, res) => {
  await prisma.city.update({ where: { id: parseInt(req.params.id) }, data: { active: false } })
  res.json({ ok: true })
})

export default router
