import { useState } from 'react'
import { RefreshCw, ExternalLink, Globe, Loader2, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HomeViewProps {
  onNext: () => void
}

const GITHUB_ACTIONS_URL = 'https://github.com/emilia-chodorowska/ZwrotKosztowLeczenia/actions/workflows/refresh.yml'
const LOCAL_SERVER = 'http://localhost:8765'

type LuxmedStatus = 'idle' | 'loading' | 'started' | 'already_running' | 'error'

export function HomeView({ onNext }: HomeViewProps) {
  const [luxmedStatus, setLuxmedStatus] = useState<LuxmedStatus>('idle')

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

      {/* Odswiez dane */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
            <RefreshCw className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">Odswiez dane faktur</h3>
            <p className="text-sm text-gray-500 mt-1">Pobierz najnowsze faktury z Google Drive przez GitHub Actions</p>
            <Button
              onClick={() => window.open(GITHUB_ACTIONS_URL, '_blank')}
              variant="outline"
              className="mt-3 gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Odswiez dane
            </Button>
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
