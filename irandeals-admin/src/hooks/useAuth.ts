import { useState } from 'react'
import { authApi } from '../api/client'

export function useAuth() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isAuthenticated = Boolean(localStorage.getItem('token'))

  async function login(username: string, password: string) {
    setLoading(true); setError('')
    try {
      const { data } = await authApi.login(username, password)
      localStorage.setItem('token', data.token)
      return true
    } catch {
      setError('Invalid username or password')
      return false
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }

  return { isAuthenticated, login, logout, loading, error }
}
