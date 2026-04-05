import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dealApi, type Deal } from '../api/client'
import { ToggleLeft, ToggleRight } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Pagination, Select } from 'pixelwizards-components'

export default function Deals() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [active, setActive] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['deals', page, active],
    queryFn: () => dealApi.list({ page: String(page), limit: '20', ...(active !== '' && { active }) }).then(r => r.data),
  })

  const toggle = useMutation({
    mutationFn: (d: Deal) => d.active ? dealApi.deactivate(d.id) : dealApi.activate(d.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deals'] }),
  })

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-stone-800">Deals</h1>
      <Card variant="glass" className="inline-flex p-4">
        <Select
          options={[
            { value: '', label: 'All' },
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Inactive' },
          ]}
          value={active}
          onChange={value => { setActive(String(value ?? '')); setPage(1) }}
        />
      </Card>

      <Card variant="glass" className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>{['Title','Business','City','Category','Expires','Active','Toggle'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-stone-500 font-medium text-xs uppercase tracking-wide">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-stone-400">Loading…</td></tr>
            ) : !data?.data.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-8">
                  <EmptyState title="No deals found" description="Try changing the active filter or add a new deal from the bot." />
                </td>
              </tr>
            ) : data?.data.map((d: Deal) => (
              <tr key={d.id} className="hover:bg-stone-50">
                <td className="px-4 py-3 font-medium max-w-[200px] truncate">{d.title}</td>
                <td className="px-4 py-3 text-stone-500">{d.business?.name ?? '—'}</td>
                <td className="px-4 py-3 text-stone-500">{d.targetCity ?? d.targetCountry}</td>
                <td className="px-4 py-3 text-stone-500">{d.business?.category ?? '—'}</td>
                <td className="px-4 py-3 text-stone-400">{new Date(d.expiresAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <Badge color={d.active ? 'success' : 'secondary'}>
                    {d.active ? 'active' : 'inactive'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Button
                    onClick={() => toggle.mutate(d)}
                    variant={d.active ? 'secondary' : 'primary'}
                    size="sm"
                    icon={d.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  >
                    {d.active ? 'Deactivate' : 'Activate'}
                  </Button>
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
