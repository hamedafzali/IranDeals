import type { Business, Deal } from '@prisma/client'

export function formatDealMessage(
  deal: Deal,
  business: Business,
  lang: 'en' | 'fa' = 'en'
): string {
  const expires = deal.expiresAt.toISOString().split('T')[0]
  return [
    `🏷 *${business.name}* — ${business.city}`,
    '',
    `*${deal.title}*`,
    deal.description,
    '',
    `⏳ ${lang === 'fa' ? 'تا' : 'Valid until'}: ${expires}`,
    `📍 ${business.city} | 🏪 ${business.category}`,
  ].join('\n')
}

export function formatBusinessCard(business: Business): string {
  const statusEmoji: Record<string, string> = {
    pending: '⏳', approved: '✅', rejected: '❌', banned: '🚫',
  }
  const lines = [
    `${statusEmoji[business.status] ?? '❓'}${business.verified ? ' 🏅' : ''} *${business.name}*`,
    `📍 ${business.city}, ${business.country}`,
    `🏷 ${business.category}`,
  ]
  if (business.phone)     lines.push(`📞 ${business.phone}`)
  if (business.website)   lines.push(`🌐 ${business.website}`)
  if (business.instagram) lines.push(`📸 @${business.instagram}`)
  lines.push(`\`${business.id}\``)
  return lines.join('\n')
}

export function formatDigest(
  pairs: Array<{ deal: Deal; business: Business }>,
  lang: 'en' | 'fa' = 'en'
): string {
  const date = new Date().toISOString().split('T')[0]
  const title = lang === 'fa' ? `📬 خلاصه تخفیف‌های امروز — ${date}` : `📬 Today's Deal Digest — ${date}`
  const divider = '─'.repeat(28)
  return [title, divider, ...pairs.map(({ deal, business }) => formatDealMessage(deal, business, lang))].join('\n\n')
}
