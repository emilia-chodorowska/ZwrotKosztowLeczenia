import { useState } from 'react'
import { ArrowLeft, CircleCheckBig, Check, Copy, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPLN, formatDate } from '@/lib/utils'
import type { Invoice, DashboardStats } from '@/types'

interface SummaryProps {
  invoices: Invoice[]
  stats: DashboardStats
  onHome: () => void
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function buildTsv(invoices: Invoice[]): string {
  const header = ['Nr faktury', 'Data wykonania', 'Kwota', 'Refundacja', 'Czy opłacone'].join('\t')
  const rows = invoices.map(inv =>
    [`="${inv.numer}"`, formatDateShort(inv.data_wykonania_uslugi), inv.kwota_faktury.toFixed(2).replace('.', ','), 'wysłano', ''].join('\t')
  )
  return [header, ...rows].join('\n')
}

const GDRIVE_URL = 'https://drive.google.com/drive/folders/1uKUpgcWY7RNk49KfSQ6kHkw7XhhdOC6_?usp=sharing'

export function Summary({ invoices, stats, onHome }: SummaryProps) {
  const [copied, setCopied] = useState(false)
  const [driveDeleted, setDriveDeleted] = useState(false)
  const [driveLoading, setDriveLoading] = useState(false)
  const [desktopDeleted, setDesktopDeleted] = useState(false)
  const [desktopLoading, setDesktopLoading] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildTsv(invoices))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleDeleteDrive = async () => {
    if (driveDeleted || driveLoading) return
    setDriveLoading(true)
    try {
      const res = await fetch('http://localhost:8765/delete-drive-files')
      const data = await res.json()
      if (data.status === 'ok') setDriveDeleted(true)
    } catch { /* ignore */ }
    setDriveLoading(false)
  }

  const handleDeleteDesktop = async () => {
    if (desktopDeleted || desktopLoading) return
    setDesktopLoading(true)
    try {
      const res = await fetch('http://localhost:8765/delete-desktop-folder')
      const data = await res.json()
      if (data.status === 'ok') setDesktopDeleted(true)
    } catch { /* ignore */ }
    setDesktopLoading(false)
  }

  return (
    <div className="flex flex-col gap-6 flex-1">
      <button onClick={onHome} className="flex items-center gap-0.5 text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
        <ArrowLeft className="w-3.5 h-3.5" />
        Wróć do panelu
      </button>

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
          <CircleCheckBig className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <p className="text-sm text-gray-400 mb-1">Gotowe</p>
          <h2 className="text-xl font-semibold text-gray-900">Wniosek wysłany</h2>
        </div>
      </div>

      <div className="rounded-xl bg-gray-50 px-5 py-3 flex items-center justify-between text-sm">
        <span className="text-gray-500">{stats.invoiceCount} faktur · {formatDate(stats.dateRange.from)} – {formatDate(stats.dateRange.to)}</span>
        <span className="font-medium text-gray-900">{formatPLN(stats.totalAmount)}</span>
      </div>

      <div className="rounded-xl bg-gray-50 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Dane do Excela</h3>
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
                <span>Kopiuj</span>
              </>
            )}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="pb-2 pr-3 font-medium">Nr faktury</th>
                <th className="pb-2 pr-3 font-medium">Data usługi</th>
                <th className="pb-2 pr-3 font-medium">Kwota</th>
                <th className="pb-2 font-medium">Refundacja</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => (
                <tr key={i} className="text-gray-900">
                  <td className="py-1 pr-3 font-medium">{inv.numer}</td>
                  <td className="py-1 pr-3">{formatDateShort(inv.data_wykonania_uslugi)}</td>
                  <td className="py-1 pr-3">{inv.kwota_faktury.toFixed(2)}</td>
                  <td className="py-1 text-green-600 font-medium">wysłano</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`rounded-xl p-4 border transition-colors space-y-3 ${driveDeleted && desktopDeleted ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <label className="flex items-center gap-3 cursor-pointer" onClick={handleDeleteDrive}>
          {driveLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400 shrink-0" />
          ) : (
            <input
              type="checkbox"
              checked={driveDeleted}
              readOnly
              className={`w-4 h-4 rounded border-gray-300 cursor-pointer ${driveDeleted ? 'accent-green-600' : 'accent-gray-400'}`}
            />
          )}
          <span className="text-sm font-medium text-gray-900">Usuń pliki faktur z Google Drive</span>
          <a
            href={GDRIVE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${driveDeleted ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </label>
        <label className="flex items-center gap-3 cursor-pointer" onClick={handleDeleteDesktop}>
          {desktopLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-400 shrink-0" />
          ) : (
            <input
              type="checkbox"
              checked={desktopDeleted}
              readOnly
              className={`w-4 h-4 rounded border-gray-300 cursor-pointer ${desktopDeleted ? 'accent-green-600' : 'accent-gray-400'}`}
            />
          )}
          <p className="text-sm font-medium text-gray-900">Usuń folder z fakturami z Pulpitu</p>
        </label>
      </div>

      <div className="mt-auto">
        <Button
          onClick={onHome}
          className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 gap-2 rounded-xl px-8 py-3 text-base w-full shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Wróć do panelu
        </Button>
      </div>
    </div>
  )
}
