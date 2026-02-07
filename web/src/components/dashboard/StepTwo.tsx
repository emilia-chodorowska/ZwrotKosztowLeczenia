import { useState } from 'react'
import { ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Check, Copy, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Invoice } from '@/types'

interface StepTwoProps {
  invoices: Invoice[]
  onBack: () => void
  onNext: () => void
  onHome: () => void
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded text-gray-300 hover:text-gray-500 transition-colors cursor-pointer"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-500" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  )
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function StepTwo({ invoices, onBack, onNext, onHome }: StepTwoProps) {
  const [current, setCurrent] = useState(0)
  const inv = invoices[current]
  const isFirst = current === 0
  const isLast = current === invoices.length - 1

  return (
    <div className="flex flex-col gap-6 flex-1">
      <button onClick={onHome} className="flex items-center gap-0.5 text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
        <ArrowLeft className="w-3.5 h-3.5" />
        Wróć do panelu
      </button>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center shrink-0">
          <ClipboardList className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <p className="text-sm text-gray-400 mb-1">Krok 2 z 3 — Dane z faktur</p>
          <h2 className="text-xl font-semibold text-gray-900">Dane do skopiowania</h2>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="relative">
        {/* Strzałka lewa */}
        {!isFirst && (
          <button
            onClick={() => setCurrent(current - 1)}
            className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer z-10"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Strzałka prawa */}
        <button
          onClick={() => setCurrent(current + 1)}
          disabled={isLast}
          className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-0 disabled:pointer-events-none z-10"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="rounded-xl bg-gray-50 p-5 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {formatDateHeader(inv.data_wykonania_uslugi)}
          </h3>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400">Nr faktury</p>
              <div className="flex items-center gap-1">
                <p className="text-base font-semibold text-gray-900">{inv.numer}</p>
                <CopyBtn text={inv.numer} />
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-400">Data wystawienia</p>
              <div className="flex items-center gap-1">
                <p className="text-base font-semibold text-gray-900">{formatDateShort(inv.data_wystawienia)}</p>
                <CopyBtn text={formatDateShort(inv.data_wystawienia)} />
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-400">Miejsce</p>
              <div className="flex items-center gap-1">
                <p className="text-base font-semibold text-gray-900">{inv.miasto_wykonania}</p>
                <CopyBtn text={inv.miasto_wykonania} />
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-400">Kwota</p>
              <div className="flex items-center gap-1">
                <p className="text-base font-semibold text-gray-900">{inv.kwota_faktury.toFixed(2)}</p>
                <CopyBtn text={inv.kwota_faktury.toFixed(2)} />
              </div>
            </div>
          </div>
        </div>
      </div>

        <p className="text-center text-xs text-gray-400 mt-4">Faktura {current + 1} z {invoices.length}</p>
      </div>

      <div className="flex gap-3">
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
