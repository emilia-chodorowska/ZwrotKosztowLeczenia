import { useState } from 'react'
import { ArrowRight, ArrowLeft, ChevronLeft, CalendarDays, Check, Copy } from 'lucide-react'
import type { Invoice } from '@/types'
import { Button } from '@/components/ui/button'

interface StepOneProps {
  invoices: Invoice[]
  onBack: () => void
  onNext: () => void
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function StepOne({ invoices, onBack, onNext }: StepOneProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText('logopeda')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col gap-6 flex-1">
      <button onClick={onBack} className="flex items-center gap-0.5 text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
        <ArrowLeft className="w-3.5 h-3.5" />
        Wróć do panelu
      </button>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
          <CalendarDays className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-400 mb-1">Krok 1 z 3 — Lista usług</p>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Daty wykonania usług</h2>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-green-500">Skopiowano</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>logopeda</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {invoices.map((inv, i) => (
          <div
            key={i}
            className="rounded-xl bg-gray-50 px-5 py-4"
          >
            <span className="text-base font-semibold text-gray-900">
              Usługa {i + 1} → {formatDateShort(inv.data_wykonania_uslugi)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-auto flex gap-3">
        <Button
          onClick={onBack}
          className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 gap-2 rounded-xl px-8 py-3 text-base flex-1 shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Wróć
        </Button>
        <Button
          onClick={onNext}
          className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 gap-2 rounded-xl px-8 py-3 text-base flex-1 shadow-sm cursor-pointer"
        >
          Dalej
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
