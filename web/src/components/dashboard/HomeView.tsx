import { useState, useEffect, useRef, useCallback } from 'react'
import { RefreshCw, Globe, Loader2, Check, AlertCircle, FileText, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPLN, formatDate } from '@/lib/utils'
import type { Invoice, DashboardStats } from '@/types'

interface HomeViewProps {
  invoices: Invoice[]
  stats: DashboardStats
  refetch: () => Promise<void>
  onNext: () => void
}

const LOCAL_SERVER = 'http://localhost:8765'
const POLL_INTERVAL = 15_000

type ActionStatus = 'idle' | 'loading' | 'started' | 'already_running' | 'error'
type RefreshStatus = ActionStatus | 'polling' | 'done'

const LUXMED_FORM_URL = 'https://portalpacjenta.luxmed.pl/PatientPortal/NewPortal/Page/UserProfile/statements/refund/performed-services'

export function HomeView({ invoices, stats, refetch, onNext }: HomeViewProps) {
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus>('idle')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = null
  }, [])

  useEffect(() => () => stopPolling(), [stopPolling])

  const checkWorkflow = useCallback(async () => {
    try {
      const res = await fetch(`${LOCAL_SERVER}/workflow-status`)
      const data = await res.json()
      if (data.status === 'completed') {
        stopPolling()
        await refetch()
        setRefreshStatus(data.conclusion === 'success' ? 'done' : 'error')
      }
    } catch { /* keep polling */ }
  }, [stopPolling, refetch])

  const triggerRefresh = async () => {
    setRefreshStatus('loading')
    try {
      const res = await fetch(`${LOCAL_SERVER}/trigger-refresh`)
      const data = await res.json()
      if (data.status !== 'triggered') {
        setRefreshStatus('error')
        return
      }

      setRefreshStatus('polling')
      pollRef.current = setInterval(checkWorkflow, POLL_INTERVAL)
    } catch {
      setRefreshStatus('error')
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 flex flex-col justify-center gap-6">
      {/* Załadowane dane */}
      <div className="rounded-xl bg-gray-50 p-8">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">Załadowane faktury</h3>
            {invoices.length > 0 ? (
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">{stats.invoiceCount}</span> faktur
                </p>
                <p className="text-sm text-gray-600">
                  Okres: <span className="font-medium text-gray-900">{formatDate(stats.dateRange.from)} – {formatDate(stats.dateRange.to)}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Łączna kwota: <span className="font-medium text-gray-900">{formatPLN(stats.totalAmount)}</span>
                </p>
              </div>
            ) : (
              <p className="text-sm text-amber-600 mt-2">Brak danych — odśwież faktury</p>
            )}
          </div>
        </div>
      </div>

      {/* Odśwież dane */}
      <div className="rounded-xl bg-gray-50 p-8">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
            <RefreshCw className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">Odśwież dane faktur</h3>
            <p className="text-sm text-gray-500 mt-1">Pobierz najnowsze faktury z Google Drive</p>

            <Button
              onClick={triggerRefresh}
              variant="outline"
              className="mt-3 gap-2 cursor-pointer"
              disabled={refreshStatus === 'loading' || refreshStatus === 'polling'}
            >
              {(refreshStatus === 'loading' || refreshStatus === 'polling') && <Loader2 className="w-4 h-4 animate-spin" />}
              {(refreshStatus === 'started' || refreshStatus === 'done') && <Check className="w-4 h-4 text-green-500" />}
              {refreshStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
              {refreshStatus === 'idle' && <RefreshCw className="w-4 h-4" />}
              {refreshStatus === 'idle' && 'Odśwież dane'}
              {refreshStatus === 'loading' && 'Uruchamiam...'}
              {refreshStatus === 'polling' && 'Czekam na dane...'}
              {refreshStatus === 'started' && 'Odświeżanie uruchomione'}
              {refreshStatus === 'done' && 'Dane zaktualizowane!'}
              {refreshStatus === 'error' && 'Błąd'}
            </Button>

            {refreshStatus === 'polling' && (
              <p className="text-xs text-purple-600 mt-2">
                Trwa odświeżanie — dane zaktualizują się automatycznie
              </p>
            )}
            {refreshStatus === 'done' && (
              <p className="text-xs text-green-600 mt-2">
                Dane zostały zaktualizowane!
              </p>
            )}
            {refreshStatus === 'error' && (
              <p className="text-xs text-red-400 mt-2">
                Upewnij się że serwer ZwrotApp jest uruchomiony
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Otwórz LuxMed */}
      <div className="rounded-xl bg-gray-50 p-8">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">Otwórz formularz LuxMed</h3>
            <p className="text-sm text-gray-500 mt-1">Otworzy formularz zwrotu kosztów w nowym oknie</p>

            <Button
              onClick={() => window.open(LUXMED_FORM_URL, '_blank', 'width=1280,height=900')}
              variant="outline"
              className="mt-3 gap-2 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              Otwórz LuxMed
            </Button>
          </div>
        </div>
      </div>
      </div>

      {/* Dalej */}
      <Button
        onClick={onNext}
        className="mt-6 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 gap-2 rounded-xl px-8 py-3 text-base w-full shadow-sm cursor-pointer"
      >
        Dalej — wypełnij dane
      </Button>
    </div>
  )
}
