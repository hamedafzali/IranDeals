import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { deliveryApi, type Delivery } from '../api/client'
import { Badge, Card, EmptyState, Pagination, Select } from 'pixelwizards-components'

export default function DeliveryLog() {
  const [page, setPage] = useState(1)
  const [channel, setChannel] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['deliveries', page, channel],
    queryFn: () => deliveryApi.list({ page: String(page), limit: '20', ...(channel && { channel }) }).then(r => r.data),
  })

  const CHANNEL_BADGE: Record<string, 'info' | 'warning' | 'secondary'> = {
    direct: 'info',
    daily_digest: 'warning',
    weekly_digest: 'secondary',
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-stone-800">Delivery Log</h1>
      <Card variant="glass" className="inline-flex p-4">
        <Select
          options={[
            { value: '', label: 'All channels' },
            ...['direct', 'daily_digest', 'weekly_digest'].map(c => ({ value: c, label: c.replace('_', ' ') })),
          ]}
          value={channel}
          onChange={value => { setChannel(String(value ?? '')); setPage(1) }}
        />
      </Card>

      <Card variant="glass" className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>{['Deal','Subscriber ID','Channel','Sent At'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-stone-500 font-medium text-xs uppercase tracking-wide">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {isLoading ? <tr><td colSpan={4} className="px-4 py-8 text-center text-stone-400">Loading…</td></tr>
              : !data?.data.length ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8">
                    <EmptyState title="No deliveries logged" description="Deliveries will appear here after the bot sends direct or digest messages." />
                  </td>
                </tr>
              )
              : data?.data.map((d: Delivery) => (
                <tr key={d.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 font-medium max-w-[240px] truncate">{d.deal?.title ?? d.dealId}</td>
                  <td className="px-4 py-3 font-mono text-xs text-stone-400">{d.subscriberId.slice(0, 8)}…</td>
                  <td className="px-4 py-3">
                    <Badge color={CHANNEL_BADGE[d.channel] ?? 'secondary'}>
                      {d.channel.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-stone-400">{new Date(d.sentAt).toLocaleString()}</td>
                </tr>
              ))}
          </tbody>
        </table>
        {data && (
          <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-stone-200 text-sm text-stone-500">
            <span>{data.total} total</span>
            <Pagination page={page} totalPages={Math.max(1, Math.ceil(data.total / 20))} onPageChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  )
}
