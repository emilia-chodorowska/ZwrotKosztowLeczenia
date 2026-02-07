import { FileText, DollarSign, TrendingUp, Calendar } from 'lucide-react'
import type { DashboardStats } from '@/types'
import { formatPLN, formatDate } from '@/lib/utils'

interface StatsCardsProps {
  stats: DashboardStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Liczba faktur',
      value: stats.invoiceCount.toString(),
      icon: FileText,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      title: 'Laczna kwota',
      value: formatPLN(stats.totalAmount),
      icon: DollarSign,
      color: 'bg-green-100 text-green-600',
    },
    {
      title: 'Srednia faktura',
      value: formatPLN(stats.averageAmount),
      icon: TrendingUp,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      title: 'Zakres dat',
      value: stats.dateRange.from
        ? `${formatDate(stats.dateRange.from)} - ${formatDate(stats.dateRange.to)}`
        : 'Brak danych',
      icon: Calendar,
      color: 'bg-orange-100 text-orange-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.title}
            className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-sm text-gray-500 font-medium">{card.title}</p>
            </div>
            <p className="text-xl font-semibold text-gray-900">{card.value}</p>
          </div>
        )
      })}
    </div>
  )
}
