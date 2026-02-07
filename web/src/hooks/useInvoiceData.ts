import { useState, useEffect, useMemo } from 'react'
import type { Invoice, DashboardStats, MonthlyStats } from '@/types'

export function useInvoiceData() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `${import.meta.env.BASE_URL}faktury_dane.json?t=${Date.now()}`
      )
      if (!response.ok) throw new Error('Nie udalo sie zaladowac danych')
      const data: Invoice[] = await response.json()
      setInvoices(data)
      setLastUpdated(new Date())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nieznany blad')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const stats: DashboardStats = useMemo(() => {
    if (invoices.length === 0) {
      return {
        totalAmount: 0,
        invoiceCount: 0,
        averageAmount: 0,
        dateRange: { from: '', to: '' },
        monthlyBreakdown: [],
      }
    }

    const totalAmount = invoices.reduce((sum, inv) => sum + inv.kwota_faktury, 0)
    const invoiceCount = invoices.length
    const averageAmount = totalAmount / invoiceCount

    const dates = invoices.map(inv => inv.data_wykonania_uslugi).sort()
    const dateRange = { from: dates[0], to: dates[dates.length - 1] }

    const monthMap = new Map<string, { total: number; count: number }>()
    for (const inv of invoices) {
      const date = new Date(inv.data_wykonania_uslugi)
      const key = date.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })
      const existing = monthMap.get(key) || { total: 0, count: 0 }
      monthMap.set(key, { total: existing.total + inv.kwota_faktury, count: existing.count + 1 })
    }

    const monthlyBreakdown: MonthlyStats[] = Array.from(monthMap.entries()).map(
      ([month, data]) => ({ month, ...data })
    )

    return { totalAmount, invoiceCount, averageAmount, dateRange, monthlyBreakdown }
  }, [invoices])

  return { invoices, stats, loading, error, lastUpdated, refetch: fetchData }
}
