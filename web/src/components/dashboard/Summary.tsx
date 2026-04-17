import { useEffect, useState } from 'react'
import { AlertCircle, ArrowLeft, CircleCheckBig, Check, Copy, ExternalLink, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPLN, formatDate } from '@/lib/utils'
import { playSuccessDing } from '@/lib/sounds'
import type { Invoice, DashboardStats } from '@/types'

interface SummaryProps {
  invoices: Invoice[]
  stats: DashboardStats
  onBack: () => void
  onHome: () => void
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateDayMonth(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })
}

function buildTransferTitle(invoices: Invoice[]): string {
  const dates = [...invoices]
    .sort((a, b) => a.data_wykonania_uslugi.localeCompare(b.data_wykonania_uslugi))
    .map(inv => formatDateDayMonth(inv.data_wykonania_uslugi))
    .join(', ')
  return `TERAPIA LOGOPEDYCZNA TOMASZ CHODOROWSKI ${dates}`
}

function buildTsv(invoices: Invoice[]): string {
  const header = ['Nr faktury', 'Data wykonania', 'Kwota', 'Refundacja', 'Czy opłacone'].join('\t')
  const rows = invoices.map(inv =>
    [`="${inv.numer}"`, formatDateShort(inv.data_wykonania_uslugi), inv.kwota_faktury.toFixed(2).replace('.', ','), 'wysłano', ''].join('\t')
  )
  return [header, ...rows].join('\n')
}

const GDRIVE_URL = 'https://drive.google.com/drive/folders/1uKUpgcWY7RNk49KfSQ6kHkw7XhhdOC6_?usp=sharing'

export function Summary({ invoices, stats, onBack, onHome }: SummaryProps) {
  const [copied, setCopied] = useState(false)
  const [titleCopied, setTitleCopied] = useState(false)
  const [driveDeleted, setDriveDeleted] = useState(false)
  const [driveLoading, setDriveLoading] = useState(false)
  const [driveError, setDriveError] = useState<string | null>(null)
  const [desktopDeleted, setDesktopDeleted] = useState(false)
  const [desktopLoading, setDesktopLoading] = useState(false)
  const [desktopError, setDesktopError] = useState<string | null>(null)
  const [desktopExists, setDesktopExists] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('http://localhost:8765/check-desktop-folder')
      .then(r => r.json())
      .then(d => setDesktopExists(!!d.exists))
      .catch(() => setDesktopExists(false))
  }, [])

  const showDesktop = desktopExists === true

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildTsv(invoices))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleCopyTitle = async () => {
    await navigator.clipboard.writeText(buildTransferTitle(invoices))
    setTitleCopied(true)
    setTimeout(() => setTitleCopied(false), 1500)
  }

  const handleDeleteDrive = async () => {
    if (driveDeleted || driveLoading) return
    setDriveLoading(true)
    setDriveError(null)
    try {
      const res = await fetch('http://localhost:8765/delete-drive-files')
      const data = await res.json()
      if (data.status === 'ok') {
        setDriveDeleted(true)
        playSuccessDing()
      } else setDriveError(data.message || 'Nie udało się usunąć')
    } catch (e) {
      setDriveError(e instanceof Error ? e.message : 'Błąd połączenia')
    }
    setDriveLoading(false)
  }

  const handleDeleteDesktop = async () => {
    if (desktopDeleted || desktopLoading) return
    setDesktopLoading(true)
    setDesktopError(null)
    try {
      const res = await fetch('http://localhost:8765/delete-desktop-folder')
      const data = await res.json()
      if (data.status === 'ok') setDesktopDeleted(true)
      else setDesktopError(data.message || 'Nie udało się usunąć')
    } catch (e) {
      setDesktopError(e instanceof Error ? e.message : 'Błąd połączenia')
    }
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

      <div className="rounded-xl bg-gray-50 p-5 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Tytuł przelewu</h3>
          <button
            onClick={handleCopyTitle}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            {titleCopied ? (
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
        <p className="text-xs text-gray-600 break-words">{buildTransferTitle(invoices)}</p>
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

      <div className="space-y-1">
        <div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleDeleteDrive}
              disabled={driveDeleted || driveLoading}
              className="flex-1 flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer disabled:cursor-default disabled:hover:bg-transparent"
            >
              {driveLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400 shrink-0" />
              ) : driveDeleted ? (
                <Check className="w-4 h-4 text-green-600 shrink-0" />
              ) : driveError ? (
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              ) : (
                <Trash2 className="w-4 h-4 text-gray-400 shrink-0" />
              )}
              <span className={`text-sm ${driveDeleted ? 'text-green-700' : driveError ? 'text-red-600' : 'text-gray-700'}`}>
                {driveDeleted ? 'Usunięto pliki z Google Drive' : driveError ? 'Nie udało się usunąć' : 'Usuń pliki faktur z Google Drive'}
              </span>
            </button>
            <a
              href={GDRIVE_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Otwórz folder w Google Drive"
              className="p-2 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          {driveError && (
            <p className="text-xs text-red-500 px-2 mt-0.5 break-words">{driveError}</p>
          )}
        </div>
        {showDesktop && (
          <div>
            <button
              type="button"
              onClick={handleDeleteDesktop}
              disabled={desktopDeleted || desktopLoading}
              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer disabled:cursor-default disabled:hover:bg-transparent"
            >
              {desktopLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400 shrink-0" />
              ) : desktopDeleted ? (
                <Check className="w-4 h-4 text-green-600 shrink-0" />
              ) : desktopError ? (
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              ) : (
                <Trash2 className="w-4 h-4 text-gray-400 shrink-0" />
              )}
              <span className={`text-sm ${desktopDeleted ? 'text-green-700' : desktopError ? 'text-red-600' : 'text-gray-700'}`}>
                {desktopDeleted ? 'Usunięto folder z Pulpitu' : desktopError ? 'Nie udało się usunąć' : 'Usuń folder z fakturami z Pulpitu'}
              </span>
            </button>
            {desktopError && (
              <p className="text-xs text-red-500 px-2 mt-0.5 break-words">{desktopError}</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto flex gap-3">
        <Button
          onClick={onBack}
          className="bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 gap-2 rounded-xl px-8 py-3 text-base flex-1 shadow-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Wróć
        </Button>
        <div className="flex-1" />
      </div>
    </div>
  )
}
