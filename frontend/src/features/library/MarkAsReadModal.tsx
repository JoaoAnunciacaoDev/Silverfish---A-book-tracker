import { useState, useEffect } from 'react'
import type { UserBook } from '@/types/library'
import { X, Calendar, Check, BookOpen, AlertCircle } from 'lucide-react'

interface MarkAsReadModalProps {
  isOpen: boolean
  userBook: UserBook | null
  onClose: () => void
  onSuccess: (updatedBook: UserBook) => void
  onSaveDate: (id: string, finishedAt: string | null) => Promise<UserBook>
}

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1950 + 1 }, (_, i) => CURRENT_YEAR - i)

export function MarkAsReadModal({
  isOpen,
  userBook,
  onClose,
  onSuccess,
  onSaveDate,
}: MarkAsReadModalProps) {
  const [option, setOption] = useState<'today' | 'exact' | 'year' | 'none'>('today')
  const [exactDate, setExactDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userBook) {
      if (userBook.finished_at) {
        const d = new Date(userBook.finished_at)
        const isYearOnly =
          userBook.finished_at.includes('-01-01T12:00:00') ||
          (d.getUTCMonth() === 0 && d.getUTCDate() === 1 && d.getUTCHours() === 12 && d.getUTCMinutes() === 0)

        if (isYearOnly) {
          setOption('year')
          setSelectedYear(d.getUTCFullYear())
        } else {
          setOption('exact')
          setExactDate(userBook.finished_at.slice(0, 10))
        }
      } else {
        setOption('today')
        setExactDate(new Date().toISOString().slice(0, 10))
        setSelectedYear(CURRENT_YEAR)
      }
      setError(null)
    }
  }, [userBook, isOpen])

  if (!isOpen || !userBook) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsLoading(true)
      setError(null)

      let finishedAtPayload: string | null = null
      if (option === 'today') {
        finishedAtPayload = new Date().toISOString().slice(0, 10)
      } else if (option === 'exact') {
        finishedAtPayload = exactDate || new Date().toISOString().slice(0, 10)
      } else if (option === 'year') {
        finishedAtPayload = selectedYear.toString()
      } else {
        finishedAtPayload = null
      }

      const updated = await onSaveDate(userBook.id, finishedAtPayload)
      onSuccess(updated)
      onClose()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Erro ao salvar data de conclusão')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Quando você leu este livro?</h3>
              <p className="text-xs text-slate-400">Registre a data para acompanhar seu histórico por ano</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Livro Info */}
        <div className="flex items-center space-x-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
          <div className="w-12 h-16 bg-slate-800 rounded-lg overflow-hidden shrink-0 border border-slate-700/40">
            {userBook.book.cover_url ? (
              <img
                src={userBook.book.cover_url}
                alt={userBook.book.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600">
                <BookOpen className="w-5 h-5" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">{userBook.book.title}</h4>
            <p className="text-xs text-slate-400 truncate">{userBook.book.author}</p>
            <span className="text-[11px] text-slate-500 mt-0.5 block">{userBook.book.page_count} páginas</span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Escolha como deseja registrar:</label>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setOption('today')}
                className={`py-2 px-2 rounded-xl text-xs font-medium border transition cursor-pointer text-center ${
                  option === 'today'
                    ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Hoje
              </button>

              <button
                type="button"
                onClick={() => setOption('exact')}
                className={`py-2 px-2 rounded-xl text-xs font-medium border transition cursor-pointer text-center ${
                  option === 'exact'
                    ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Data exata
              </button>

              <button
                type="button"
                onClick={() => setOption('year')}
                className={`py-2 px-2 rounded-xl text-xs font-medium border transition cursor-pointer text-center ${
                  option === 'year'
                    ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Apenas ano
              </button>

              <button
                type="button"
                onClick={() => setOption('none')}
                className={`py-2 px-2 rounded-xl text-xs font-medium border transition cursor-pointer text-center ${
                  option === 'none'
                    ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Não lembrar
              </button>
            </div>
          </div>

          {/* Campo Data Exata */}
          {option === 'exact' && (
            <div className="space-y-1 animate-in fade-in duration-150">
              <label className="text-xs text-slate-400">Selecione a data de conclusão:</label>
              <input
                type="date"
                value={exactDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setExactDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-white focus:outline-hidden transition"
              />
            </div>
          )}

          {/* Campo Apenas Ano */}
          {option === 'year' && (
            <div className="space-y-1 animate-in fade-in duration-150">
              <label className="text-xs text-slate-400">Em qual ano você concluiu este livro?</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-white focus:outline-hidden transition cursor-pointer"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    Ano {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {option === 'none' && (
            <p className="text-xs text-slate-500 italic bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
              O livro será marcado como lido sem vincular uma data específica ao seu histórico anual.
            </p>
          )}

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-800 text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Salvar Leitura</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
