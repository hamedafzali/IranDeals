import fa from '../i18n/fa.json'
import en from '../i18n/en.json'

type Strings = typeof en
type Key = keyof Strings

const strings: Record<string, Strings> = { fa: fa as Strings, en }

export function t(key: Key, lang: 'en' | 'fa' = 'en', vars?: Record<string, string | number>): string {
  const template: string = strings[lang]?.[key] ?? strings.en[key] ?? key
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`))
}

export function detectLang(languageCode?: string): 'en' | 'fa' {
  return languageCode?.startsWith('fa') ? 'fa' : 'en'
}
