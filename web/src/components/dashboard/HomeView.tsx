import { useState, useEffect, useRef, useCallback } from 'react'
import { RefreshCw, Globe, Loader2, Check, AlertCircle, FileText } from 'lucide-react'
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

export function HomeView({ invoices, stats, refetch, onNext }: HomeViewProps) {
  const [luxmedStatus, setLuxmedStatus] = useState<ActionStatus>('idle')
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

  const launchLuxmed = async () => {
    setLuxmedStatus('loading')
    try {
      const res = await fetch(`${LOCAL_SERVER}/launch-luxmed`)
      const data = await res.json()
      setLuxmedStatus(data.status === 'already_running' ? 'already_running' : 'started')
    } catch {
      setLuxmedStatus('error')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Zwrot kosztow leczenia</h2>
        <p className="text-sm text-gray-500 mt-1">Wykonaj kolejne kroki aby zlozyc wniosek</p>
      </div>

      {/* Zaladowane dane */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">Zaladowane faktury</h3>
            {invoices.length > 0 ? (
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">{stats.invoiceCount}</span> faktur
                </p>
                <p className="text-sm text-gray-600">
                  Okres: <span className="font-medium text-gray-900">{formatDate(stats.dateRange.from)} – {formatDate(stats.dateRange.to)}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Laczna kwota: <span className="font-medium text-gray-900">{formatPLN(stats.totalAmount)}</span>
                </p>
              </div>
            ) : (
              <p className="text-sm text-amber-600 mt-2">Brak danych — odswiez faktury</p>
            )}
          </div>
        </div>
      </div>

      {/* Odswiez dane */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
            <RefreshCw className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">Odswiez dane faktur</h3>
            <p className="text-sm text-gray-500 mt-1">Pobierz najnowsze faktury z Google Drive</p>

            <Button
              onClick={triggerRefresh}
              variant="outline"
              className="mt-3 gap-2"
              disabled={refreshStatus === 'loading' || refreshStatus === 'polling'}
            >
              {(refreshStatus === 'loading' || refreshStatus === 'polling') && <Loader2 className="w-4 h-4 animate-spin" />}
              {(refreshStatus === 'started' || refreshStatus === 'done') && <Check className="w-4 h-4 text-green-500" />}
              {refreshStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
              {refreshStatus === 'idle' && <RefreshCw className="w-4 h-4" />}
              {refreshStatus === 'idle' && 'Odswiez dane'}
              {refreshStatus === 'loading' && 'Uruchamiam...'}
              {refreshStatus === 'polling' && 'Czekam na dane...'}
              {refreshStatus === 'started' && 'Odswiezanie uruchomione'}
              {refreshStatus === 'done' && 'Dane zaktualizowane!'}
              {refreshStatus === 'error' && 'Blad'}
            </Button>

            {refreshStatus === 'polling' && (
              <p className="text-xs text-purple-600 mt-2">
                Trwa odswiezanie — dane zaktualizuja sie automatycznie
              </p>
            )}
            {refreshStatus === 'done' && (
              <p className="text-xs text-green-600 mt-2">
                Dane zostaly zaktualizowane!
              </p>
            )}
            {refreshStatus === 'error' && (
              <p className="text-xs text-red-400 mt-2">
                Upewnij sie ze serwer ZwrotApp jest uruchomiony
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Otworz LuxMed */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <Globe className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">Otworz formularz LuxMed</h3>
            <p className="text-sm text-gray-500 mt-1">Automatycznie zaloguje sie i otworzy formularz zwrotu kosztow</p>

            <Button
              onClick={launchLuxmed}
              variant="outline"
              className="mt-3 gap-2"
              disabled={luxmedStatus === 'loading'}
            >
              {luxmedStatus === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
              {luxmedStatus === 'started' && <Check className="w-4 h-4 text-green-500" />}
              {luxmedStatus === 'already_running' && <Check className="w-4 h-4 text-green-500" />}
              {luxmedStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
              {(luxmedStatus === 'idle') && <Globe className="w-4 h-4" />}
              {luxmedStatus === 'idle' && 'Otworz LuxMed'}
              {luxmedStatus === 'loading' && 'Uruchamiam...'}
              {luxmedStatus === 'started' && 'LuxMed uruchomiony!'}
              {luxmedStatus === 'already_running' && 'LuxMed juz dziala'}
              {luxmedStatus === 'error' && 'Blad polaczenia'}
            </Button>

            {luxmedStatus === 'error' && (
              <p className="text-xs text-red-400 mt-2">
                Upewnij sie ze "Start ZwrotApp.command" jest uruchomiony
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Dalej */}
      <Button
        onClick={onNext}
        className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-xl px-8 py-3 text-base w-full"
      >
        Dalej — wypelnij dane
      </Button>
    </div>
  )
}
