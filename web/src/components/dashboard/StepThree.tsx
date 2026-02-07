import { useState } from 'react'
import { ArrowLeft, Landmark, Check, Copy, CheckCircle, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StepThreeProps {
  onBack: () => void
  onNext: () => void
  onHome: () => void
}

type MergeState = 'idle' | 'loading' | 'done' | 'error'

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

const NUMER_RACHUNKU = '55 1140 2004 0000 3802 8355 6074'
const WLASCICIEL = 'Emilia Chodorowska'

export function StepThree({ onBack, onNext, onHome }: StepThreeProps) {
  const [mergeState, setMergeState] = useState<MergeState>('idle')

  const handleMerge = async () => {
    setMergeState('loading')
    try {
      const res = await fetch('http://localhost:8765/merge-pdfs')
      const data = await res.json()
      setMergeState(data.status === 'ok' ? 'done' : 'error')
    } catch {
      setMergeState('error')
    }
  }

  return (
    <div className="flex flex-col gap-6 flex-1">
      <button onClick={onHome} className="flex items-center gap-0.5 text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
        <ArrowLeft className="w-3.5 h-3.5" />
        Wróć do panelu
      </button>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center shrink-0">
          <Landmark className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <p className="text-sm text-gray-400 mb-1">Krok 3 z 3 — Dane do przelewu</p>
          <h2 className="text-xl font-semibold text-gray-900">Konto bankowe</h2>
        </div>
      </div>

      <div>
        <div className="rounded-xl bg-gray-50 p-5 space-y-4">
          <div>
            <p className="text-xs text-gray-400">Numer rachunku</p>
            <div className="flex items-center gap-1">
              <p className="text-base font-semibold text-gray-900">{NUMER_RACHUNKU}</p>
              <CopyBtn text={NUMER_RACHUNKU} />
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-400">Właściciel rachunku</p>
            <div className="flex items-center gap-1">
              <p className="text-base font-semibold text-gray-900">{WLASCICIEL}</p>
              <CopyBtn text={WLASCICIEL} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto flex gap-3">
        <Button
          onClick={onBack}
          className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 gap-2 rounded-xl py-3 text-sm flex-1 shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Wróć
        </Button>
        <Button
          onClick={handleMerge}
          disabled={mergeState === 'loading' || mergeState === 'done'}
          className={`gap-2 rounded-xl py-3 text-sm flex-1 shadow-sm cursor-pointer border ${
            mergeState === 'done'
              ? 'bg-green-50 hover:bg-green-50 text-green-700 border-green-200'
              : mergeState === 'error'
                ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                : 'bg-white hover:bg-gray-50 text-gray-900 border-gray-200'
          }`}
        >
          {mergeState === 'loading' ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Scalanie...</>
          ) : mergeState === 'done' ? (
            <><Check className="w-4 h-4" />Zapisano</>
          ) : mergeState === 'error' ? (
            <><Download className="w-4 h-4" />Ponów</>
          ) : (
            <><Download className="w-4 h-4" />Ściągnij faktury</>
          )}
        </Button>
        <Button
          onClick={onNext}
          className="bg-green-600 hover:bg-green-700 text-white gap-2 rounded-xl py-3 text-sm flex-1 shadow-sm cursor-pointer"
        >
          <CheckCircle className="w-4 h-4" />
          Wysłany
        </Button>
      </div>
    </div>
  )
}
