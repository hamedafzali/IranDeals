interface Props {
  label: string
  value: number | string
  sub?: string
  color?: 'saffron' | 'green' | 'blue' | 'red'
}
const colors = {
  saffron: 'text-saffron-500', green: 'text-deep-green-500',
  blue: 'text-blue-500', red: 'text-red-500',
}
export default function StatCard({ label, value, sub, color = 'saffron' }: Props) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5">
      <div className={`text-3xl font-bold ${colors[color]}`}>{value}</div>
      <div className="text-sm font-medium text-stone-700 mt-1">{label}</div>
      {sub && <div className="text-xs text-stone-400 mt-1">{sub}</div>}
    </div>
  )
}
