import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { businessApi, type Business } from '../api/client'
import { CheckCircle, XCircle, Ban, Search } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input, Pagination, Select } from 'pixelwizards-components'

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'error' | 'secondary'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  banned: 'secondary',
}

export default function Businesses() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['businesses', page, status, search],
    queryFn: () => businessApi.list({ page: String(page), limit: '20', ...(status && { status }), ...(search && { search }) }).then(r => r.data),
  })

  const approve = useMutation({ mutationFn: (id: string) => businessApi.approve(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['businesses'] }) })
  const reject  = useMutation({ mutationFn: (id: string) => businessApi.reject(id),  onSuccess: () => qc.invalidateQueries({ queryKey: ['businesses'] }) })
  const ban     = useMutation({ mutationFn: (id: string) => businessApi.ban(id),     onSuccess: () => qc.invalidateQueries({ queryKey: ['businesses'] }) })

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-stone-800">Businesses</h1>

      <Card variant="glass" className="flex flex-wrap gap-3 p-4">
        <div className="min-w-[240px] flex-1">
          <Input
            placeholder="Search name…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            leftIcon={<Search size={14} />}
            fullWidth
          />
        </div>
        <div className="min-w-[220px]">
          <Select
            options={[
              { value: '', label: 'All statuses' },
              ...['pending', 'approved', 'rejected', 'banned'].map(s => ({ value: s, label: s })),
            ]}
            value={status}
            onChange={value => { setStatus(String(value ?? '')); setPage(1) }}
          />
        </div>
      </Card>

      <Card variant="glass" className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>{['Name','City','Category','Status','Verified','Created','Actions'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-stone-500 font-medium text-xs uppercase tracking-wide">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-stone-400">Loading…</td></tr>
            ) : !data?.data.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-8">
                  <EmptyState title="No businesses found" description="Try a different search term or status filter." />
                </td>
              </tr>
            ) : data?.data.map((b: Business) => (
              <tr key={b.id} className="hover:bg-stone-50">
                <td className="px-4 py-3 font-medium">{b.name}</td>
                <td className="px-4 py-3 text-stone-500">{b.city}, {b.country}</td>
                <td className="px-4 py-3 text-stone-500">{b.category}</td>
                <td className="px-4 py-3">
                  <Badge color={STATUS_BADGE[b.status]}>{b.status}</Badge>
                </td>
                <td className="px-4 py-3">{b.verified ? '🏅' : '—'}</td>
                <td className="px-4 py-3 text-stone-400">{new Date(b.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {b.status !== 'approved' && (
                      <Button onClick={() => approve.mutate(b.id)} title="Approve" variant="ghost" size="sm" icon={<CheckCircle size={16} />}>Approve</Button>
                    )}
                    {b.status === 'pending' && (
                      <Button onClick={() => reject.mutate(b.id)} title="Reject" variant="danger" size="sm" icon={<XCircle size={16} />}>Reject</Button>
                    )}
                    {b.status !== 'banned' && (
                      <Button onClick={() => ban.mutate(b.id)} title="Ban" variant="secondary" size="sm" icon={<Ban size={16} />}>Ban</Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && (
          <div className="flex items-center justify-between gap-4 border-t border-stone-200 px-4 py-3 text-sm text-stone-500">
            <span>{data.total} total</span>
            <Pagination page={page} totalPages={Math.max(1, Math.ceil(data.total / 20))} onPageChange={setPage} />
          </div>
        )}
      </Card>
    </div>
  )
}
