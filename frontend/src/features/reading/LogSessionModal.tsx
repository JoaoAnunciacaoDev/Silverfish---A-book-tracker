import { useEffect, useState } from 'react'
import { createReadingSession } from '@/api/reading'
import type { UserBook } from '@/types/library'
import type { ReadingSession } from '@/types/reading'
import { BookOpen, CheckCircle, Loader2, Star, X } from 'lucide-react'

interface LogSessionModalProps {
  item: UserBook | null
  isOpen: boolean
  onClose: () => void
  onSuccess: (session: ReadingSession) => void
}

const feelings = ['Inspirado', 'Focado', 'Curioso', 'Emocionado', 'Cansado']

export function LogSessionModal({
  item,
  isOpen,
  onClose,
  onSuccess,
}: LogSessionModalProps) {
  const [startPage, setStartPage] = useState(0)
  const [endPage, setEndPage] = useState(15)
  const [comprehension, setComprehension] = useState<number>(4)
  const [feeling, setFeeling] = useState<string>('Focado')
  const [notes, setNotes] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (item && isOpen) {
      const total = item.book.page_count || 100
      setStartPage(item.current_page)
      setEndPage(Math.min(total, item.current_page + 15))
      setComprehension(4)
      setFeeling('Focado')
      setNotes('')
      setError(null)
    }
  }, [item, isOpen])

  if (!isOpen || !item) return null

  const totalPages = item.book.page_count || 100
  const pagesRead = Math.max(0, endPage - startPage)
  const willCompleteBook = endPage >= totalPages

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (endPage <= startPage) {
      setError('A pagina final deve ser maior que a pagina inicial')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const res = await createReadingSession({
        user_book_id: item.id,
        start_page: startPage,
        end_page: endPage,
        comprehension,
        feeling,
        notes: notes.trim() || undefined,
      })
      onSuccess(res.session)
      onClose()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Erro ao registrar sessao de leitura')
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
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Registrar Sessao de Leitura</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1">
          <h4 className="font-semibold text-white text-sm truncate">{item.book.title}</h4>
          <p className="text-xs text-slate-400">{item.book.author}</p>
        </div>

        {error && (
          <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Pagina Inicial</label>
              <input
                type="number"
                min="0"
                max={totalPages}
                value={startPage}
                onChange={(e) => setStartPage(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm font-semibold text-white focus:outline-hidden transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Pagina Final</label>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={endPage}
                onChange={(e) => setEndPage(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm font-semibold text-white focus:outline-hidden transition"
              />
            </div>
          </div>

          <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Total Lido Nesta Sessao</span>
            <span className="font-bold text-emerald-400">{pagesRead} paginas</span>
          </div>

          {willCompleteBook && (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center space-x-2 text-xs text-emerald-400">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Esta sessao vai concluir a leitura deste livro.</span>
            </div>
          )}

          {/* Compreensao */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Nivel de Compreensao</label>
            <div className="flex items-center space-x-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setComprehension(star)}
                  className={`p-1.5 rounded-lg border transition cursor-pointer ${
                    comprehension >= star
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-slate-950/60 border-slate-800 text-slate-600'
                  }`}
                >
                  <Star className={`w-4 h-4 ${comprehension >= star ? 'fill-amber-400' : ''}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Sensacao */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Como se sentiu lendo?</label>
            <div className="flex flex-wrap gap-1.5">
              {feelings.map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => setFeeling(f)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition cursor-pointer ${
                    feeling === f
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">Reflexao ou citacao (opcional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="O que achou deste trecho?"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-hidden transition resize-none"
            />
          </div>

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
              disabled={isLoading || pagesRead <= 0}
              className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-medium text-sm transition cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Salvar Sessao</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
