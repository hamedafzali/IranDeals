import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Store, Tag, Users, MapPin, Send, LogOut } from 'lucide-react'
import { Badge, ThemeToggle } from 'pixelwizards-components'
import { useAuth } from '../hooks/useAuth'

const nav = [
  { to: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/businesses',  label: 'Businesses',  icon: Store },
  { to: '/deals',       label: 'Deals',       icon: Tag },
  { to: '/subscribers', label: 'Subscribers', icon: Users },
  { to: '/locations',   label: 'Locations',   icon: MapPin },
  { to: '/deliveries',  label: 'Deliveries',  icon: Send },
]

export default function Layout() {
  const { logout } = useAuth()
  return (
    <div className="flex h-screen bg-stone-50">
      <aside className="w-56 bg-white border-r border-stone-200 flex flex-col">
        <div className="p-5 border-b border-stone-200">
          <span className="font-bold text-saffron-500 text-lg">Iran Deals</span>
          <span className="text-xs text-stone-400 block">Admin Panel</span>
          <div className="mt-3 flex items-center justify-between">
            <Badge color="warning">Live</Badge>
            <ThemeToggle />
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-saffron-50 text-saffron-600 font-medium' : 'text-stone-600 hover:bg-stone-100'}`
              }>
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>
        <button onClick={logout} className="flex items-center gap-3 px-6 py-4 text-sm text-stone-500 hover:text-red-600 border-t border-stone-200">
          <LogOut size={16} /> Logout
        </button>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  )
}
