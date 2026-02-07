import { useState, useEffect, useCallback } from 'react'
import { HomeView } from '@/components/dashboard/HomeView'
import { StepOne } from '@/components/dashboard/StepOne'
import { StepTwo } from '@/components/dashboard/StepTwo'
import { StepThree } from '@/components/dashboard/StepThree'
import { Summary } from '@/components/dashboard/Summary'
import { useInvoiceData } from '@/hooks/useInvoiceData'

type Step = 'home' | 'step1' | 'step2' | 'step3' | 'summary'

const VALID_STEPS: Step[] = ['home', 'step1', 'step2', 'step3', 'summary']

function getStepFromHash(): Step {
  const hash = window.location.hash.slice(1)
  return VALID_STEPS.includes(hash as Step) ? (hash as Step) : 'home'
}

function App() {
  const [step, setStep] = useState<Step>(getStepFromHash)
  const { invoices, stats, loading, error, refetch } = useInvoiceData()

  const navigate = useCallback((to: Step) => {
    window.location.hash = to === 'home' ? '' : to
    setStep(to)
  }, [])

  useEffect(() => {
    const onPopState = () => setStep(getStepFromHash())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-2xl mx-auto px-4 pt-16 pb-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-800">
            Zwrot kosztów leczenia
          </h1>
          <p className="text-sm text-gray-400 mt-1">Wykonaj kolejne kroki aby złożyć wniosek</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 h-[700px] flex flex-col overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        ) : (
          <>
            {step === 'home' && (
              <HomeView invoices={invoices} stats={stats} refetch={refetch} onNext={() => navigate('step1')} />
            )}
            {step === 'step1' && (
              <StepOne invoices={invoices} onBack={() => navigate('home')} onNext={() => navigate('step2')} />
            )}
            {step === 'step2' && (
              <StepTwo invoices={invoices} onBack={() => navigate('step1')} onNext={() => navigate('step3')} onHome={() => navigate('home')} />
            )}
            {step === 'step3' && (
              <StepThree onBack={() => navigate('step2')} onNext={() => navigate('summary')} onHome={() => navigate('home')} />
            )}
            {step === 'summary' && (
              <Summary invoices={invoices} stats={stats} onHome={() => navigate('home')} />
            )}
          </>
        )}
        </div>
      </div>
    </div>
  )
}

export default App
