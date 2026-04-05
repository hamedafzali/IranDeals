import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Input, ThemeToggle } from 'pixelwizards-components'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const { login, loading, error } = useAuth()
  const navigate = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const ok = await login(username, password)
    if (ok) navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,#f4ecda_0%,#eef6f2_45%,#f7f4ee_100%)] p-6">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <Card variant="glass" className="p-8">
          <h1 className="mb-1 text-2xl font-bold text-saffron-500">Iran Deals</h1>
          <p className="mb-6 text-sm text-stone-500">Admin Panel</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <Alert status="error" title="Sign in failed" description={error} />}
          <Button type="submit" variant="primary" disabled={loading} className="w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        </Card>
      </div>
    </div>
  )
}
