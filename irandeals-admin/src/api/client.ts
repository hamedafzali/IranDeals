import axios from 'axios'

export const api = axios.create({ baseURL: '/api', withCredentials: true })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Typed API calls ──────────────────────────────────────────────────────────

export const authApi = {
  login: (username: string, password: string) =>
    api.post<{ token: string }>('/auth/login', { username, password }),
}

export const analyticsApi = {
  summary: () => api.get<AnalyticsSummary>('/analytics/summary'),
}

export const businessApi = {
  list: (params?: Record<string, string>) => api.get<Paginated<Business>>('/businesses', { params }),
  get: (id: string) => api.get<Business>(`/businesses/${id}`),
  update: (id: string, data: Partial<Business>) => api.put<Business>(`/businesses/${id}`, data),
  approve: (id: string) => api.post<Business>(`/businesses/${id}/approve`),
  reject: (id: string, reason?: string) => api.post<Business>(`/businesses/${id}/reject`, { reason }),
  ban: (id: string) => api.post<Business>(`/businesses/${id}/ban`),
}

export const dealApi = {
  list: (params?: Record<string, string>) => api.get<Paginated<Deal>>('/deals', { params }),
  get: (id: string) => api.get<Deal>(`/deals/${id}`),
  update: (id: string, data: Partial<Deal>) => api.put<Deal>(`/deals/${id}`, data),
  activate: (id: string) => api.post<Deal>(`/deals/${id}/activate`),
  deactivate: (id: string) => api.post<Deal>(`/deals/${id}/deactivate`),
  delete: (id: string) => api.delete(`/deals/${id}`),
}

export const subscriberApi = {
  list: (params?: Record<string, string>) => api.get<Paginated<Subscriber>>('/subscribers', { params }),
  deactivate: (id: string) => api.post(`/subscribers/${id}/deactivate`),
}

export const locationApi = {
  countries: () => api.get<Country[]>('/locations/countries'),
  createCountry: (data: { name: string; code?: string }) => api.post<Country>('/locations/countries', data),
  updateCountry: (id: number, data: Partial<Country>) => api.put<Country>(`/locations/countries/${id}`, data),
  deleteCountry: (id: number) => api.delete(`/locations/countries/${id}`),
  cities: (countryId?: number) => api.get<City[]>('/locations/cities', { params: countryId ? { countryId } : {} }),
  createCity: (data: { name: string; countryId: number }) => api.post<City>('/locations/cities', data),
  updateCity: (id: number, data: Partial<City>) => api.put<City>(`/locations/cities/${id}`, data),
  deleteCity: (id: number) => api.delete(`/locations/cities/${id}`),
}

export const deliveryApi = {
  list: (params?: Record<string, string>) => api.get<Paginated<Delivery>>('/deliveries', { params }),
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface Paginated<T> { data: T[]; total: number; page: number; limit: number }

export interface Business {
  id: string; telegramId: string; name: string; country: string; city: string
  category: string; phone?: string; website?: string; instagram?: string
  status: 'pending' | 'approved' | 'rejected' | 'banned'; verified: boolean
  createdAt: string; approvedAt?: string
}

export interface Deal {
  id: string; businessId: string; title: string; description: string
  imageUrl?: string; targetCountry: string; targetCity?: string
  expiresAt: string; active: boolean; createdAt: string; broadcastAt?: string
  business?: Business
}

export interface Subscriber {
  id: string; telegramId: string; cities: string[]; categories: string[]
  frequency: 'instant' | 'daily' | 'weekly'; language: 'en' | 'fa'
  active: boolean; createdAt: string
}

export interface Country { id: number; name: string; code?: string; active: boolean; cities?: City[] }
export interface City { id: number; name: string; countryId: number; active: boolean; country?: Country }
export interface Delivery { id: string; dealId: string; subscriberId: string; sentAt: string; channel: string; deal?: { title: string } }

export interface AnalyticsSummary {
  businesses: { total: number; byStatus: Record<string, number> }
  subscribers: { total: number; byFrequency: Record<string, number>; byLanguage: Record<string, number> }
  deals: { active: number; thisWeek: number; thisMonth: number; byCategory: Record<string, number> }
  deliveries: { total: number; byChannel: Record<string, number>; thisWeek: number }
  locations: { countries: number; cities: number }
  topCitiesDeals: Array<{ city: string; count: number }>
}
