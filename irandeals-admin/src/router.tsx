import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Businesses from './pages/Businesses'
import Deals from './pages/Deals'
import Subscribers from './pages/Subscribers'
import Locations from './pages/Locations'
import DeliveryLog from './pages/DeliveryLog'

function AuthGuard() {
  return localStorage.getItem('token') ? <Outlet /> : <Navigate to="/login" replace />
}

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    element: <AuthGuard />,
    children: [{
      element: <Layout />,
      children: [
        { index: true, element: <Navigate to="/dashboard" replace /> },
        { path: 'dashboard', element: <Dashboard /> },
        { path: 'businesses', element: <Businesses /> },
        { path: 'deals', element: <Deals /> },
        { path: 'subscribers', element: <Subscribers /> },
        { path: 'locations', element: <Locations /> },
        { path: 'deliveries', element: <DeliveryLog /> },
      ],
    }],
  },
])
