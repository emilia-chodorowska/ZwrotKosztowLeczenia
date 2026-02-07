import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table'
import type { Invoice } from '@/types'
import { formatPLN, formatDate } from '@/lib/utils'

interface InvoiceTableProps {
  invoices: Invoice[]
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-gray-400 hover:text-purple-600 transition-colors ml-1"
      title="Kopiuj"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-500" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  )
}

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  if (invoices.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center text-gray-400">
        Brak faktur do wyswietlenia
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Lista faktur</h3>
        <p className="text-sm text-gray-500 mt-1">Kliknij ikonke kopiowania aby skopiowac wartosc</p>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nr faktury</TableHead>
              <TableHead>Data wystawienia</TableHead>
              <TableHead>Data uslugi</TableHead>
              <TableHead>Miasto</TableHead>
              <TableHead className="text-right">Kwota</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">
                  {inv.numer}
                  <CopyButton text={inv.numer} />
                </TableCell>
                <TableCell>
                  {formatDate(inv.data_wystawienia)}
                  <CopyButton text={formatDate(inv.data_wystawienia)} />
                </TableCell>
                <TableCell>
                  {formatDate(inv.data_wykonania_uslugi)}
                  <CopyButton text={formatDate(inv.data_wykonania_uslugi)} />
                </TableCell>
                <TableCell>
                  {inv.miasto_wykonania}
                  <CopyButton text={inv.miasto_wykonania} />
                </TableCell>
                <TableCell className="text-right">
                  {formatPLN(inv.kwota_faktury)}
                  <CopyButton text={inv.kwota_faktury.toFixed(2)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-gray-100">
        {invoices.map((inv, i) => (
          <div key={i} className="p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-sm font-medium text-gray-900">{inv.numer}</span>
                <CopyButton text={inv.numer} />
              </div>
              <span className="text-sm font-semibold text-purple-600">
                {formatPLN(inv.kwota_faktury)}
                <CopyButton text={inv.kwota_faktury.toFixed(2)} />
              </span>
            </div>
            <div className="flex gap-4 text-xs text-gray-500">
              <span>
                Wystawiona: {formatDate(inv.data_wystawienia)}
                <CopyButton text={formatDate(inv.data_wystawienia)} />
              </span>
              <span>
                Usluga: {formatDate(inv.data_wykonania_uslugi)}
                <CopyButton text={formatDate(inv.data_wykonania_uslugi)} />
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {inv.miasto_wykonania}
              <CopyButton text={inv.miasto_wykonania} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
