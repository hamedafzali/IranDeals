import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '../api/client'
import StatCard from '../components/StatCard'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

const COLORS = ['#E8A020', '#1A6B3C', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899']

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => analyticsApi.summary().then(r => r.data),
    refetchInterval: 60_000,
  })

  if (isLoading) return <div className="text-stone-400 text-sm">Loading…</div>
  if (!data) return null

  const bizStatusData = Object.entries(data.businesses.byStatus).map(([name, value]) => ({ name, value }))
  const freqData = Object.entries(data.subscribers.byFrequency).map(([name, value]) => ({ name, value }))
  const channelData = Object.entries(data.deliveries.byChannel).map(([name, value]) => ({ name, value }))
  const categoryData = Object.entries(data.deals.byCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Businesses" value={data.businesses.total} color="saffron" />
        <StatCard label="Active Subscribers" value={data.subscribers.total} color="green" />
        <StatCard label="Active Deals" value={data.deals.active} sub={`${data.deals.thisWeek} this week`} color="blue" />
        <StatCard label="Total Deliveries" value={data.deliveries.total} sub={`${data.deliveries.thisWeek} this week`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <h2 className="font-semibold text-stone-700 mb-4">Businesses by Status</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={bizStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                {bizStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <h2 className="font-semibold text-stone-700 mb-4">Top Cities by Active Deals</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.topCitiesDeals} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="city" tick={{ fontSize: 12 }} width={90} />
              <Tooltip />
              <Bar dataKey="count" fill="#E8A020" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <h2 className="font-semibold text-stone-700 mb-4">Subscribers by Frequency</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={freqData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#1A6B3C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <h2 className="font-semibold text-stone-700 mb-4">Deliveries by Channel</h2>
          <div className="space-y-3">
            {channelData.map(({ name, value }) => {
              const pct = data.deliveries.total ? Math.round((value / data.deliveries.total) * 100) : 0
              return (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-stone-600 capitalize">{name.replace('_', ' ')}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                  <div className="h-1.5 bg-stone-100 rounded-full">
                    <div className="h-1.5 bg-saffron-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-5">
        <h2 className="font-semibold text-stone-700 mb-4">Active Deals by Category</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={categoryData}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
