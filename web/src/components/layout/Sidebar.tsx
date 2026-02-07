import { ClipboardList, RefreshCw, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ViewType = 'fill' | 'refresh'

interface SidebarProps {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
}

const navItems: { id: ViewType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'fill', label: 'Wypelnij dane', icon: ClipboardList },
  { id: 'refresh', label: 'Odswiez dane', icon: RefreshCw },
]

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Receipt className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">ZwrotApp</h1>
              <p className="text-xs text-gray-500">Koszty leczenia</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.id
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-purple-50 text-purple-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className={cn('w-5 h-5', isActive ? 'text-purple-600' : 'text-gray-400')} />
                {item.label}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.id
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  'flex flex-col items-center gap-1 px-4 py-2 text-xs font-medium transition-colors',
                  isActive ? 'text-purple-600' : 'text-gray-400'
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
