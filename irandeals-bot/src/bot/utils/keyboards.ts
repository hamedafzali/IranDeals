import { InlineKeyboard } from 'grammy'

export const CATEGORIES = [
  { value: 'Restaurant',  key: 'cat_restaurant' },
  { value: 'Grocery',     key: 'cat_grocery' },
  { value: 'Beauty',      key: 'cat_beauty' },
  { value: 'Travel',      key: 'cat_travel' },
  { value: 'RealEstate',  key: 'cat_realestate' },
  { value: 'Legal',       key: 'cat_legal' },
  { value: 'Healthcare',  key: 'cat_healthcare' },
  { value: 'Retail',      key: 'cat_retail' },
  { value: 'Other',       key: 'cat_other' },
]

export function mainMenuKeyboard() {
  return new InlineKeyboard()
    .text('🔔 Subscribe to Deals / عضو شو', 'action:subscribe').row()
    .text('🏪 Register My Business / ثبت کسب‌وکار', 'action:register')
}

export function citySearchResultsKeyboard(
  results: Array<{ city: string; country: string }>,
  selected: string[] = [],
  multi = false
) {
  const kb = new InlineKeyboard()
  for (const { city, country } of results) {
    const check = selected.includes(city) ? '✅ ' : ''
    kb.text(`${check}${city}, ${country}`, `city:${city}|${country}`).row()
  }
  if (multi) kb.text('✅ Done / تمام', 'action:done')
  return kb
}

export function selectedCitiesKeyboard(selected: string[]) {
  const kb = new InlineKeyboard()
  for (const city of selected) {
    kb.text(`❌ ${city}`, `city_remove:${city}`).row()
  }
  kb.text('✅ Done / تمام', 'action:done')
  return kb
}

export function categoryKeyboard(selected: string[] = []) {
  const kb = new InlineKeyboard()
  for (const { value, key } of CATEGORIES) {
    const check = selected.includes(value) ? '✅ ' : ''
    kb.text(`${check}${value}`, `cat:${value}`).row()
  }
  kb.text('✅ Done / تمام', 'action:done')
  return kb
}

export function confirmKeyboard() {
  return new InlineKeyboard()
    .text('✅ Yes / بله', 'confirm:yes')
    .text('✏️ Edit / ویرایش', 'confirm:edit')
}

export function frequencyKeyboard() {
  return new InlineKeyboard()
    .text('⚡ Instant / فوری', 'freq:instant').row()
    .text('📅 Daily digest / روزانه', 'freq:daily').row()
    .text('📆 Weekly / هفتگی', 'freq:weekly')
}

export function expiryKeyboard() {
  return new InlineKeyboard()
    .text('Today / امروز', 'expiry:0')
    .text('3 days / ۳ روز', 'expiry:3').row()
    .text('7 days / ۷ روز', 'expiry:7')
    .text('14 days / ۱۴ روز', 'expiry:14').row()
    .text('Custom / دلخواه', 'expiry:custom')
}

export function regionKeyboard(city: string, country: string) {
  return new InlineKeyboard()
    .text(`📍 ${city} only`, 'region:city').row()
    .text(`🌍 All of ${country}`, 'region:country')
}

export function adminBusinessKeyboard(businessId: string) {
  return new InlineKeyboard()
    .text('✅ Approve', `admin:approve:${businessId}`)
    .text('❌ Reject', `admin:reject:${businessId}`).row()
    .text('🚫 Ban', `admin:ban:${businessId}`)
}

export function reportDealKeyboard(dealId: string) {
  return new InlineKeyboard()
    .text('🚩 Report / گزارش', `report:${dealId}`)
}

export function broadcastConfirmKeyboard() {
  return new InlineKeyboard()
    .text('✅ Send / ارسال', 'broadcast:confirm')
    .text('❌ Cancel / لغو', 'broadcast:cancel')
}
