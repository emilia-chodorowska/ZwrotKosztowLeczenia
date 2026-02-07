import { RefreshCw, ExternalLink, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RefreshViewProps {
  lastUpdated: Date | null
}

const GITHUB_ACTIONS_URL = 'https://github.com/emilia-chodorowska/ZwrotKosztowLeczenia/actions/workflows/refresh.yml'

export function RefreshView({ lastUpdated }: RefreshViewProps) {
  const handleRefresh = () => {
    window.open(GITHUB_ACTIONS_URL, '_blank')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
        <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <RefreshCw className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Odswiez dane faktur</h2>
        <p className="text-gray-500 mb-6">
          Kliknij przycisk ponizej aby uruchomic pobieranie nowych faktur z Google Drive.
          Zostaniesz przekierowany do GitHub Actions.
        </p>
        <Button onClick={handleRefresh} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
          <ExternalLink className="w-4 h-4" />
          Odswiez dane z Google Drive
        </Button>

        {lastUpdated && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-400">
            <Clock className="w-4 h-4" />
            Ostatnie pobranie danych: {lastUpdated.toLocaleString('pl-PL')}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Jak to dziala?</h3>
        <ol className="space-y-3 text-sm text-gray-600">
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-semibold shrink-0">1</span>
            Kliknij przycisk "Odswiez dane z Google Drive"
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-semibold shrink-0">2</span>
            Na stronie GitHub Actions kliknij "Run workflow"
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-semibold shrink-0">3</span>
            Poczekaj az workflow sie zakonczy (ok. 2-3 min)
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-semibold shrink-0">4</span>
            Odswiez te strone - dane beda aktualne
          </li>
        </ol>
      </div>
    </div>
  )
}
