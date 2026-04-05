import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { locationApi, type Country, type City } from '../api/client'
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { Badge, Button, Card, EmptyState, Input } from 'pixelwizards-components'

export default function Locations() {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState<number | null>(null)
  const [newCountry, setNewCountry] = useState({ name: '', code: '' })
  const [newCity, setNewCity] = useState<Record<number, string>>({})

  const { data: countries } = useQuery({ queryKey: ['countries'], queryFn: () => locationApi.countries().then(r => r.data) })

  const addCountry = useMutation({
    mutationFn: () => locationApi.createCountry({ name: newCountry.name, code: newCountry.code || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['countries'] }); setNewCountry({ name: '', code: '' }) },
  })
  const deleteCountry = useMutation({
    mutationFn: (id: number) => locationApi.deleteCountry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['countries'] }),
  })
  const addCity = useMutation({
    mutationFn: ({ name, countryId }: { name: string; countryId: number }) => locationApi.createCity({ name, countryId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['countries'] }); setNewCity({}) },
  })
  const deleteCity = useMutation({
    mutationFn: (id: number) => locationApi.deleteCity(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['countries'] }),
  })

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-stone-800">Locations</h1>

      {/* Add country */}
      <Card variant="glass" className="p-5">
        <h2 className="font-semibold text-stone-700 mb-3">Add Country</h2>
        <div className="flex gap-3">
          <Input placeholder="Country name" value={newCountry.name} onChange={e => setNewCountry(p => ({ ...p, name: e.target.value }))} fullWidth />
          <div className="w-28">
            <Input placeholder="Code" value={newCountry.code} onChange={e => setNewCountry(p => ({ ...p, code: e.target.value }))} />
          </div>
          <Button onClick={() => newCountry.name && addCountry.mutate()} variant="primary" icon={<Plus size={14} />}>
            Add
          </Button>
        </div>
      </Card>

      {/* Countries & cities */}
      <Card variant="glass" className="overflow-hidden p-0 divide-y divide-stone-100">
        {!countries?.length ? (
          <div className="p-8">
            <EmptyState title="No locations available" description="Seed locations or add a country to get started." />
          </div>
        ) : countries?.map((country: Country) => (
          <div key={country.id}>
            <div className="flex items-center justify-between px-5 py-3 hover:bg-stone-50 cursor-pointer"
              onClick={() => setExpanded(expanded === country.id ? null : country.id)}>
              <div className="flex items-center gap-2">
                {expanded === country.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span className="font-medium">{country.name}</span>
                {country.code && <Badge color="secondary">{country.code}</Badge>}
                <span className="text-xs text-stone-400">({country.cities?.length ?? 0} cities)</span>
              </div>
              <Button onClick={e => { e.stopPropagation(); if (confirm(`Delete ${country.name}?`)) deleteCountry.mutate(country.id) }}
                variant="danger" size="sm" icon={<Trash2 size={14} />}>
                Delete
              </Button>
            </div>

            {expanded === country.id && (
              <div className="px-10 pb-4 bg-stone-50 space-y-2">
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {country.cities?.map((city: City) => (
                    <div key={city.id} className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-2">
                      <span className="truncate pr-2 text-sm text-stone-600">{city.name}</span>
                      <Button onClick={() => deleteCity.mutate(city.id)} variant="danger" size="sm" icon={<Trash2 size={13} />}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Input placeholder="New city name" value={newCity[country.id] ?? ''}
                    onChange={e => setNewCity(p => ({ ...p, [country.id]: e.target.value }))}
                    fullWidth />
                  <Button onClick={() => { const n = newCity[country.id]; if (n) addCity.mutate({ name: n, countryId: country.id }) }}
                    variant="secondary" icon={<Plus size={12} />}>
                    Add city
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </Card>
    </div>
  )
}
