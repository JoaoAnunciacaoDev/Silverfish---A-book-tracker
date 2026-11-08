import { useState } from 'react'
import type { UserBook } from '@/types/library'
import { Bookmark, CheckCircle2, Loader2, X } from 'lucide-react'

interface UpdateProgressModalProps {
  item: UserBook | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (id: string, newPage: number) => Promise<void>
}

export function UpdateProgressModal({
  item,
  isOpen,
  onClose,
  onUpdate,
}: UpdateProgressModalProps) {
  if (!isOpen || !item) return null

  const totalPages = item.book.page_count || 100
  const [page, setPage] = useState(item.current_page)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const percentage = Math.min(100, Math.round((page / totalPages) * 100))
  const isFinished = page >= totalPages

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (page < 0) {
      setError('A página não pode ser negativa')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      await onUpdate(item.id, page)
      onClose()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Erro ao atualizar progresso')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Bookmark className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Atualizar Progresso</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1">
          <h4 className="font-semibold text-white text-sm line-clamp-1">{item.book.title}</h4>
          <p className="text-xs text-slate-400">{item.book.author}</p>
        </div>

        {error && (
          <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Página Atual</span>
              <span className="font-semibold text-emerald-400">
                {page} de {totalPages} págs ({percentage}%)
              </span>
            </div>

            {/* Barra de progresso visual */}
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <input
                type="number"
                min="0"
                max={totalPages}
                value={page}
                onChange={(e) => setPage(Math.min(totalPages, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-28 px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-center text-sm font-bold text-white focus:outline-hidden transition"
              />
              <input
                type="range"
                min="0"
                max={totalPages}
                value={page}
                onChange={(e) => setPage(parseInt(e.target.value) || 0)}
                className="flex-1 accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {isFinished && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center space-x-2.5 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Parabéns! Ao atingir a última página, o livro será marcado como <strong>Lido</strong> automaticamente!</span>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-medium text-sm transition cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Salvar Progresso</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
