export function isValidUrl(url: string): boolean {
  try { new URL(url); return url.startsWith('http'); } catch { return false }
}

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[\s\-\(\)\+]/g, '')
  return /^\d{6,15}$/.test(digits)
}

export function isValidDate(str: string): boolean {
  const d = new Date(str)
  return !isNaN(d.getTime()) && d > new Date()
}

export function containsPhone(text: string): boolean {
  return /(\+?\d[\d\s\-\(\)]{6,}\d)/.test(text)
}

export function searchCities(
  query: string,
  supported: Record<string, string[]>
): Array<{ city: string; country: string }> {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const results: Array<{ city: string; country: string }> = []
  for (const [country, cities] of Object.entries(supported)) {
    for (const city of cities) {
      if (city.toLowerCase().startsWith(q) || city.toLowerCase().includes(q)) {
        results.push({ city, country })
      }
    }
  }
  results.sort((a, b) => {
    const aStarts = a.city.toLowerCase().startsWith(q) ? 0 : 1
    const bStarts = b.city.toLowerCase().startsWith(q) ? 0 : 1
    return aStarts - bStarts || a.city.localeCompare(b.city)
  })
  return results.slice(0, 5)
}
