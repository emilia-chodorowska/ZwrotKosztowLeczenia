import { useState } from 'react'
import { ArrowLeft, Check, Copy } from 'lucide-react'
import type { Invoice } from '@/types'
import { Button } from '@/components/ui/button'

interface StepTwoProps {
  invoices: Invoice[]
  onBack: () => void
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
      className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
    >
      {copied ? (
        <span className="flex items-center gap-1 text-green-600">
          <Check className="w-3.5 h-3.5" /> Skopiowano
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <Copy className="w-3.5 h-3.5" /> Kopiuj
        </span>
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

export function StepTwo({ invoices, onBack }: StepTwoProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-400 mb-1">Krok 2 z 2 — Dane do skopiowania</p>
        <h2 className="text-xl font-semibold text-gray-900">Dane do skopiowania</h2>
      </div>

      <div className="space-y-4">
        {invoices.map((inv, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4"
          >
            <h3 className="text-lg font-semibold text-blue-600">
              {formatDateHeader(inv.data_wykonania_uslugi)}
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Nr faktury</p>
                  <p className="text-base font-semibold text-gray-900">{inv.numer}</p>
                </div>
                <CopyBtn text={inv.numer} />
              </div>

              <div>
                <p className="text-xs text-gray-400">Data wystawienia</p>
                <p className="text-base font-semibold text-gray-900">{formatDateShort(inv.data_wystawienia)}</p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Miejsce</p>
                  <p className="text-base font-semibold text-gray-900">{inv.miasto_wykonania}</p>
                </div>
                <CopyBtn text={inv.miasto_wykonania} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Kwota</p>
                  <p className="text-base font-semibold text-gray-900">{inv.kwota_faktury.toFixed(2)}</p>
                </div>
                <CopyBtn text={inv.kwota_faktury.toFixed(2)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        onClick={onBack}
        variant="outline"
        className="gap-2 rounded-xl px-6 py-3 text-base"
      >
        <ArrowLeft className="w-4 h-4" />
        Wstecz
      </Button>
    </div>
  )
}
