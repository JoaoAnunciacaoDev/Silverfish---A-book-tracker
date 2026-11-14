import { useEffect, useState } from 'react'
import { createReadingSession, updateReadingSession } from '@/api/reading'
import type { UserBook } from '@/types/library'
import type { ReadingSession } from '@/types/reading'
import { extractDateOnly, getLocalTodayDateString } from '@/utils/date'
import { BookOpen, Calendar, CheckCircle, Loader2, NotebookPen, Star, X } from 'lucide-react'
import { triggerConfetti } from '@/components/ui/confetti'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { isContentEmpty } from '@/components/ui/richText'

interface LogSessionModalProps {
  item?: UserBook | null
  availableBooks?: UserBook[]
  editingSession?: ReadingSession | null
  isOpen: boolean
  onClose: () => void
  onSuccess: (session: ReadingSession) => void
}

const feelings = [
  { label: 'Focado', emoji: '🎯' },
  { label: 'Feliz', emoji: '😊' },
  { label: 'Humor', emoji: '😂' },
  { label: 'Inspirado', emoji: '✨' },
  { label: 'Curioso', emoji: '🧐' },
  { label: 'Ansioso', emoji: '😰' },
  { label: 'Medo', emoji: '😱' },
  { label: 'Emocionado', emoji: '🥹' },
  { label: 'Reflexivo', emoji: '🤔' },
  { label: 'Triste', emoji: '😢' },
  { label: 'Chocado', emoji: '🤯' },
  { label: 'Cansado', emoji: '🥱' },
]

export function LogSessionModal({
  item,
  availableBooks = [],
  editingSession = null,
  isOpen,
  onClose,
  onSuccess,
}: LogSessionModalProps) {
  const [selectedBookId, setSelectedBookId] = useState<string>('')
  const [startPage, setStartPage] = useState(0)
  const [endPage, setEndPage] = useState(15)
  const [readAt, setReadAt] = useState<string>(getLocalTodayDateString())
  const [comprehension, setComprehension] = useState<number>(4)
  const [feeling, setFeeling] = useState<string>('Focado')
  const [notes, setNotes] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = Boolean(editingSession)

  // Determina o livro ativo (sessão em edição, item direto ou selecionado na lista)
  const activeBook =
    editingSession?.user_book ||
    item ||
    availableBooks.find((b) => b.id === selectedBookId) ||
    availableBooks[0] ||
    null

  useEffect(() => {
    if (isOpen && !editingSession) {
      if (item) {
        setSelectedBookId(item.id)
      } else if (availableBooks.length > 0 && !selectedBookId) {
        setSelectedBookId(availableBooks[0].id)
      }
    }
  }, [isOpen, item, availableBooks, selectedBookId, editingSession])

  useEffect(() => {
    if (!isOpen) return

    if (editingSession) {
      setStartPage(editingSession.start_page)
      setEndPage(editingSession.end_page)
      setReadAt(extractDateOnly(editingSession.read_at) || getLocalTodayDateString())
      setComprehension(editingSession.comprehension ?? 4)
      setFeeling(editingSession.feeling || '')
      setNotes(editingSession.notes || '')
      setError(null)
      return
    }

    if (activeBook) {
      const bookTotal = activeBook.book.page_count || 0
      const nextEnd =
        bookTotal > 0 ? Math.min(bookTotal, activeBook.current_page + 15) : activeBook.current_page + 15
      setStartPage(activeBook.current_page)
      setEndPage(nextEnd)
      setReadAt(getLocalTodayDateString())
      setComprehension(4)
      setFeeling('Focado')
      setNotes('')
      setError(null)
    }
  }, [activeBook, editingSession, isOpen])

  if (!isOpen || !activeBook) return null

  const bookPageCount = activeBook.book.page_count || 0
  const maxPage = bookPageCount > 0 ? bookPageCount : undefined
  const pagesRead = Math.max(0, endPage - startPage)
  const willCompleteBook = bookPageCount > 0 && endPage >= bookPageCount
  const todayDateString = getLocalTodayDateString()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (endPage <= startPage) {
      setError('A página final deve ser maior que a página inicial')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      if (editingSession) {
        const wasCompletedBefore =
          bookPageCount > 0 && activeBook.status === 'read' && editingSession.end_page >= bookPageCount
        const cleanNotes = isContentEmpty(notes) ? '' : notes.trim()
        const res = await updateReadingSession(editingSession.id, {
          start_page: startPage,
          end_page: endPage,
          read_at: readAt || undefined,
          comprehension,
          feeling: feeling || '',
          notes: cleanNotes,
        })
        if (willCompleteBook && !wasCompletedBefore) {
          triggerConfetti()
        }
        onSuccess(res.session)
        onClose()
      } else {
        const cleanNotes = isContentEmpty(notes) ? undefined : notes.trim()
        const res = await createReadingSession({
          user_book_id: activeBook.id,
          start_page: startPage,
          end_page: endPage,
          read_at: readAt || undefined,
          comprehension,
          feeling: feeling || undefined,
          notes: cleanNotes,
        })
        if (willCompleteBook) {
          triggerConfetti()
        }
        onSuccess(res.session)
        onClose()
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(
          editingSession
            ? 'Erro ao atualizar registro de leitura'
            : 'Erro ao registrar sessão de leitura'
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="relative w-full max-w-md max-h-[90dvh] flex flex-col overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="shrink-0 flex items-center justify-between px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">
              {isEditing ? 'Editar Registro de Leitura' : 'Registrar Sessão de Leitura'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
            {!isEditing && !item && availableBooks.length > 1 ? (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Escolha o livro</label>
                <select
                  value={activeBook.id}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                >
                  {availableBooks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.book.title} ({b.current_page}/{b.book.page_count || '?'} pág.)
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1">
                <h4 className="font-semibold text-white text-sm truncate">{activeBook.book.title}</h4>
                <p className="text-xs text-slate-400">{activeBook.book.author}</p>
              </div>
            )}

            {error && (
              <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Página Inicial</label>
                <input
                  type="number"
                  min="0"
                  max={maxPage}
                  value={startPage}
                  onChange={(e) => setStartPage(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm font-semibold text-white focus:outline-hidden transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Página Final</label>
                <input
                  type="number"
                  min="1"
                  max={maxPage}
                  value={endPage}
                  onChange={(e) => setEndPage(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm font-semibold text-white focus:outline-hidden transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Data da Leitura</span>
              </label>
              <input
                type="date"
                value={readAt}
                max={todayDateString}
                onChange={(e) => setReadAt(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-medium text-white focus:outline-hidden transition"
              />
            </div>

            <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Lido Nesta Sessão</span>
              <span className="font-bold text-emerald-400">{pagesRead} páginas</span>
            </div>

            {willCompleteBook && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center space-x-2 text-xs text-emerald-400">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>Esta sessão vai concluir a leitura deste livro.</span>
              </div>
            )}

            {/* Compreensão */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Nível de Compreensão</label>
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

            {/* Sensação */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Como se sentiu lendo?</label>
              <div className="flex flex-wrap gap-1.5">
                {feelings.map((f) => (
                  <button
                    type="button"
                    key={f.label}
                    onClick={() => setFeeling((prev) => (prev === f.label ? '' : f.label))}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition cursor-pointer ${
                      feeling === f.label
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-[13px]">{f.emoji}</span>
                    <span>{f.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Anotações com Editor de Texto Rico */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <NotebookPen className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Anotações de leitura (ou citação opcional)</span>
                </label>
                <span className="text-[10px] text-slate-500 font-normal">
                  Negrito, itálico, sublinhado e tamanhos
                </span>
              </div>
              <RichTextEditor
                value={notes}
                onChange={setNotes}
                placeholder="Registre suas anotações, aprendizados, reflexões ou uma citação marcante..."
                minHeight="90px"
              />
            </div>
          </div>

          <div className="shrink-0 flex items-center justify-end space-x-3 px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-800 bg-slate-900/95">
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
              <span>{isEditing ? 'Salvar Alterações' : 'Salvar Sessão'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
