import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { subscriberApi, type Subscriber } from '../api/client'
import { UserX } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Pagination, Select } from 'pixelwizards-components'

function CompactList({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-stone-400">—</span>

  const visible = items.slice(0, 2)
  const remaining = items.length - visible.length

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map(item => (
        <Badge key={item} color="secondary">{item}</Badge>
      ))}
      {remaining > 0 && <Badge color="info">+{remaining} more</Badge>}
    </div>
  )
}

export default function Subscribers() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [frequency, setFrequency] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['subscribers', page, frequency],
    queryFn: () => subscriberApi.list({ page: String(page), limit: '20', active: 'true', ...(frequency && { frequency }) }).then(r => r.data),
  })

  const deactivate = useMutation({
    mutationFn: (id: string) => subscriberApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscribers'] }),
  })

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-stone-800">Subscribers</h1>
      <Card variant="glass" className="inline-flex p-4">
        <Select
          options={[
            { value: '', label: 'All frequencies' },
            ...['instant', 'daily', 'weekly'].map(f => ({ value: f, label: f })),
          ]}
          value={frequency}
          onChange={value => { setFrequency(String(value ?? '')); setPage(1) }}
        />
      </Card>

      <Card variant="glass" className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>{['Telegram ID','Cities','Categories','Frequency','Language','Joined','Actions'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-stone-500 font-medium text-xs uppercase tracking-wide">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {isLoading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-stone-400">Loading…</td></tr>
              : !data?.data.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8">
                    <EmptyState title="No subscribers found" description="Try another frequency or onboard a new subscriber through the bot." />
                  </td>
                </tr>
              )
              : data?.data.map((s: Subscriber) => (
                <tr key={s.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 font-mono text-xs text-stone-500">{s.telegramId}</td>
                  <td className="px-4 py-3 text-stone-600"><CompactList items={s.cities} /></td>
                  <td className="px-4 py-3 text-stone-500 text-xs"><CompactList items={s.categories} /></td>
                  <td className="px-4 py-3"><Badge color="info">{s.frequency}</Badge></td>
                  <td className="px-4 py-3 text-stone-500">{s.language === 'fa' ? '🇮🇷 FA' : '🇬🇧 EN'}</td>
                  <td className="px-4 py-3 text-stone-400">{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Button onClick={() => { if (confirm('Deactivate this subscriber?')) deactivate.mutate(s.id) }} variant="danger" size="sm" icon={<UserX size={16} />}>
                      Deactivate
                    </Button>
                  </td>
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
