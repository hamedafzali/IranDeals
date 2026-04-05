import { Router } from 'express'
import { prisma } from '../../index'
import { bot } from '../../bot/bot'
import { t } from '../../bot/utils/i18n'

const router = Router()

router.get('/', async (req, res) => {
  const { page = '1', limit = '20', status, search } = req.query as Record<string, string>
  const skip = (parseInt(page) - 1) * parseInt(limit)
  const where = {
    ...(status ? { status } : {}),
    ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
  }
  const [data, total] = await Promise.all([
    prisma.business.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
    prisma.business.count({ where }),
  ])
  res.json({ data, total, page: parseInt(page), limit: parseInt(limit) })
})

router.get('/:id', async (req, res) => {
  const b = await prisma.business.findUnique({ where: { id: req.params.id }, include: { deals: true } })
  if (!b) { res.status(404).json({ error: 'Not found' }); return }
  res.json(b)
})

router.put('/:id', async (req, res) => {
  const b = await prisma.business.update({ where: { id: req.params.id }, data: req.body })
  res.json(b)
})

router.post('/:id/approve', async (req, res) => {
  const b = await prisma.business.update({ where: { id: req.params.id }, data: { status: 'approved', approvedAt: new Date() } })
  await prisma.adminLog.create({ data: { adminTelegramId: 0n, action: 'approve', targetType: 'business', targetId: b.id } })
  await bot.api.sendMessage(Number(b.telegramId), t('reg_approved_notification')).catch(() => {})
  res.json(b)
})

router.post('/:id/reject', async (req, res) => {
  const { reason = '' } = req.body ?? {}
  const b = await prisma.business.update({ where: { id: req.params.id }, data: { status: 'rejected' } })
  await prisma.adminLog.create({ data: { adminTelegramId: 0n, action: 'reject', targetType: 'business', targetId: b.id, note: reason } })
  await bot.api.sendMessage(Number(b.telegramId), t('reg_rejected_notification', 'en', { reason })).catch(() => {})
  res.json(b)
})

router.post('/:id/ban', async (req, res) => {
  const b = await prisma.business.update({ where: { id: req.params.id }, data: { status: 'banned' } })
  await prisma.adminLog.create({ data: { adminTelegramId: 0n, action: 'ban', targetType: 'business', targetId: b.id } })
  res.json(b)
})

export default router
