export interface Invoice {
  numer: string
  liczba_uslug: number
  data_wystawienia: string
  data_wykonania_uslugi: string
  miasto_wykonania: string
  cena_jednostkowa: number
  kwota_faktury: number
}

export interface MonthlyStats {
  month: string
  total: number
  count: number
}

export interface DashboardStats {
  totalAmount: number
  invoiceCount: number
  averageAmount: number
  dateRange: { from: string; to: string }
  monthlyBreakdown: MonthlyStats[]
}
