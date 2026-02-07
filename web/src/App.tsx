import { useState } from 'react'
import { HomeView } from '@/components/dashboard/HomeView'
import { StepOne } from '@/components/dashboard/StepOne'
import { StepTwo } from '@/components/dashboard/StepTwo'
import { useInvoiceData } from '@/hooks/useInvoiceData'

type Step = 'home' | 'step1' | 'step2'

function App() {
  const [step, setStep] = useState<Step>('home')
  const { invoices, loading, error } = useInvoiceData()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
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
              <HomeView onNext={() => setStep('step1')} />
            )}
            {step === 'step1' && (
              <StepOne invoices={invoices} onNext={() => setStep('step2')} />
            )}
            {step === 'step2' && (
              <StepTwo invoices={invoices} onBack={() => setStep('step1')} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default App
