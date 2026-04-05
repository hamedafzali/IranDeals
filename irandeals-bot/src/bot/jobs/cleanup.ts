import { prisma } from '../../index'

export async function expireOldDeals() {
  const { count } = await prisma.deal.updateMany({
    where: { active: true, expiresAt: { lte: new Date() } },
    data: { active: false },
  })
  if (count) console.log(`[cleanup] Expired ${count} deals`)
}

export async function purgeInactiveSubscribers() {
  const cutoff = new Date(Date.now() - 90 * 86400_000)
  const subs = await prisma.subscriber.findMany({
    where: { active: false, createdAt: { lte: cutoff } },
    select: { id: true },
  })
  for (const { id } of subs) {
    await prisma.dealDelivery.deleteMany({ where: { subscriberId: id } })
    await prisma.subscriber.delete({ where: { id } })
  }
  if (subs.length) console.log(`[cleanup] Purged ${subs.length} inactive subscribers`)
}
