import { ArrowRight } from 'lucide-react'
import type { Invoice } from '@/types'
import { Button } from '@/components/ui/button'

interface StepOneProps {
  invoices: Invoice[]
  onNext: () => void
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function StepOne({ invoices, onNext }: StepOneProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-400 mb-1">Krok 1 z 2 — Lista uslug</p>
        <h2 className="text-xl font-semibold text-gray-900">Daty wykonania uslug</h2>
      </div>

      <div className="space-y-3">
        {invoices.map((inv, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4"
          >
            <span className="text-base font-semibold text-blue-600">
              Usluga {i + 1} → {formatDateShort(inv.data_wykonania_uslugi)}
            </span>
          </div>
        ))}
      </div>

      <Button
        onClick={onNext}
        className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-xl px-6 py-3 text-base"
      >
        Dalej
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  )
}
