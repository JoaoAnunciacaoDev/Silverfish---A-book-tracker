import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listReadingSessions, deleteReadingSession } from '@/api/reading'
import { listLibrary } from '@/api/library'
import type { ReadingSession } from '@/types/reading'
import type { UserBook } from '@/types/library'
import { LogSessionModal } from '@/features/reading/LogSessionModal'
import { formatSessionDate } from '@/utils/date'
import { RichTextViewer } from '@/components/ui/RichTextViewer'
import { stripHtml } from '@/components/ui/richText'

const EMPTY_SESSIONS: ReadingSession[] = []
const EMPTY_LIBRARY_BOOKS: UserBook[] = []
const NOTES_PREVIEW_LIMIT = 100
import {
  BookOpen,
  Calendar,
  Filter,
  Loader2,
  NotebookPen,
  Pencil,
  Plus,
  ScrollText,
  Smile,
  Star,
  Trash2,
  X,
} from 'lucide-react'

const feelingsList = [
  { label: 'Todos', emoji: '✨' },
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

export function JournalPage() {
  const queryClient = useQueryClient()
  const [selectedFeeling, setSelectedFeeling] = useState<string>('Todos')
  const [selectedBookId, setSelectedBookId] = useState<string>('all')
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [sessionToEdit, setSessionToEdit] = useState<ReadingSession | null>(null)
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [expandedNotesIds, setExpandedNotesIds] = useState<Record<string, boolean>>({})

  const toggleNotesExpanded = (sessionId: string) => {
    setExpandedNotesIds((prev) => ({ ...prev, [sessionId]: !prev[sessionId] }))
  }

  const sessionsQuery = useQuery({
    queryKey: ['reading-sessions', { limit: 100 }],
    queryFn: () => listReadingSessions({ limit: 100 }),
  })

  const libraryQuery = useQuery({
    queryKey: ['library', { limit: 100 }],
    queryFn: () => listLibrary({ limit: 100 }),
  })

  const sessions = sessionsQuery.data?.sessions ?? EMPTY_SESSIONS
  const libraryBooks = libraryQuery.data?.items ?? EMPTY_LIBRARY_BOOKS
  const isLoading =
    (sessionsQuery.isPending && !sessionsQuery.data) ||
    (libraryQuery.isPending && !libraryQuery.data)

  // Filtragem local reativa
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (selectedFeeling !== 'Todos') {
        if (!s.feeling || !s.feeling.toLowerCase().includes(selectedFeeling.toLowerCase())) {
          return false
        }
      }
      if (selectedBookId !== 'all') {
        if (s.user_book?.book_id !== selectedBookId && s.user_book_id !== selectedBookId) {
          return false
        }
      }
      return true
    })
  }, [sessions, selectedFeeling, selectedBookId])

  // Métricas do Diário
  const totalPagesInView = useMemo(() => {
    return filteredSessions.reduce((acc, curr) => acc + curr.pages_read, 0)
  }, [filteredSessions])

  const handleDeleteSession = async (id: string) => {
    try {
      setIsDeleting(true)
      await deleteReadingSession(id)
      queryClient.setQueryData<{ sessions: ReadingSession[] }>(
        ['reading-sessions', { limit: 100 }],
        (prev) => (prev ? { ...prev, sessions: prev.sessions.filter((s) => s.id !== id) } : prev)
      )
      queryClient.invalidateQueries({ queryKey: ['reading-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['heatmap'] })
      setSessionToDelete(null)
    } catch (err) {
      console.error('Erro ao excluir sessão:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSessionLogged = () => {
    queryClient.invalidateQueries({ queryKey: ['reading-sessions'] })
    queryClient.invalidateQueries({ queryKey: ['library'] })
    queryClient.invalidateQueries({ queryKey: ['goal'] })
    queryClient.invalidateQueries({ queryKey: ['streak'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    queryClient.invalidateQueries({ queryKey: ['heatmap'] })
    queryClient.invalidateQueries({ queryKey: ['achievements'] })
  }

  // Lista de livros disponíveis para nova leitura (prioriza lendo e quer ler)
  const activeBooks = useMemo(() => {
    return libraryBooks.filter((b) => b.status === 'reading' || b.status === 'want_to_read')
  }, [libraryBooks])

  return (
    <div className="space-y-6">
      {/* Header do Diário */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <ScrollText className="w-6 h-6" />
            </div>
            <span>Diário de Leitura</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Linha do tempo das suas sessões de leitura, aprendizados e emoções em cada capítulo
          </p>
        </div>

        {activeBooks.length > 0 && (
          <button
            onClick={() => setIsLogModalOpen(true)}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-950/20 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Leitura</span>
          </button>
        )}
      </div>

      {/* Resumo Rápido */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block font-medium">Sessões Registradas</span>
          <div className="text-2xl font-black text-white mt-1">{filteredSessions.length}</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block font-medium">Páginas Lidas no Período</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">{totalPagesInView}</div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block font-medium">Sentimento Ativo</span>
          <div className="text-lg font-bold text-amber-300 mt-1.5 flex items-center gap-1.5">
            <span>{selectedFeeling}</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
            <Filter className="w-4 h-4 text-emerald-400" />
            <span>Filtrar por Livro:</span>
          </div>

          <div className="flex-1 max-w-sm">
            <select
              value={selectedBookId}
              onChange={(e) => setSelectedBookId(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-slate-200 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">Todos os Livros da Estante ({libraryBooks.length})</option>
              {libraryBooks.map((b) => (
                <option key={b.id} value={b.book_id}>
                  {b.book.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtro por Sentimento com badges horizontais */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Filtrar por Reação / Sentimento:</span>
            {selectedFeeling !== 'Todos' && (
              <button
                onClick={() => setSelectedFeeling('Todos')}
                className="text-[10px] text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" /> Limpar filtro
              </button>
            )}
          </div>
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
            {feelingsList.map((f) => (
              <button
                key={f.label}
                onClick={() => setSelectedFeeling(f.label)}
                className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  selectedFeeling === f.label
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800/80 hover:bg-slate-800/60'
                }`}
              >
                <span>{f.emoji}</span>
                <span>{f.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo da Timeline */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-xs text-slate-400">Carregando diário de leitura...</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="bg-slate-900/30 border border-slate-800/60 rounded-3xl p-12 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-slate-400">
            <ScrollText className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-white">Nenhum registro encontrado</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {selectedFeeling !== 'Todos' || selectedBookId !== 'all'
                ? 'Nenhuma sessão corresponde aos filtros selecionados. Tente limpar os filtros acima.'
                : 'Você ainda não registrou nenhuma sessão de leitura. Comece escolhendo um livro da sua estante!'}
            </p>
          </div>
          {activeBooks.length > 0 && (
            <button
              onClick={() => setIsLogModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Primeira Leitura</span>
            </button>
          )}
        </div>
      ) : (
        <div className="relative border-l border-slate-800/80 ml-3 sm:ml-6 pl-4 sm:pl-8 space-y-6">
          {filteredSessions.map((session) => {
            const formattedDate = formatSessionDate(session.read_at, {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })
            const totalBookPages = session.user_book?.book?.page_count || 0
            const progressPercent = totalBookPages > 0 ? Math.round((session.end_page / totalBookPages) * 100) : 0

            return (
              <div key={session.id} className="relative group">
                {/* Marcador na Linha do Tempo */}
                <div className="absolute -left-[25px] sm:-left-[41px] top-1.5 w-4 h-4 rounded-full bg-slate-950 border-2 border-emerald-500 group-hover:scale-125 transition-transform" />

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700/80 transition shadow-lg shadow-black/20 space-y-4">
                  {/* Cabeçalho da Sessão */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-400">
                      <Calendar className="w-4 h-4" />
                      <span>{formattedDate}</span>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end space-x-2">
                      {session.feeling && (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          <Smile className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{session.feeling}</span>
                        </span>
                      )}

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => setSessionToEdit(session)}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition sm:opacity-70 group-hover:opacity-100 cursor-pointer"
                          title="Editar registro de leitura"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSessionToDelete(session.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition sm:opacity-70 group-hover:opacity-100 cursor-pointer"
                          title="Excluir registro de leitura"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Informações do Livro & Progresso */}
                  <div className="flex items-start space-x-4">
                    {session.user_book?.book?.cover_url ? (
                      <img
                        src={session.user_book.book.cover_url}
                        alt={session.user_book.book.title}
                        className="w-12 h-16 object-cover rounded-lg border border-slate-700 shadow-xs shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-16 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 border border-slate-700/50 shrink-0">
                        <BookOpen className="w-6 h-6" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-bold text-white truncate">
                        {session.user_book?.book?.title || 'Livro da Estante'}
                      </h4>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {session.user_book?.book?.author || 'Autor desconhecido'}
                      </p>

                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          +{session.pages_read} páginas
                        </span>
                        <span className="text-xs text-slate-400">
                          pág. {session.start_page} → {session.end_page}
                          {totalBookPages > 0 && ` (${progressPercent}% concluído)`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Avaliação de Compreensão (Estrelas) */}
                  {session.comprehension && session.comprehension > 0 && (
                    <div className="flex items-center space-x-2 pt-1">
                      <span className="text-xs text-slate-400">Compreensão do texto:</span>
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= (session.comprehension || 0)
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Anotações de leitura */}
                  {session.notes && (() => {
                    const plainText = stripHtml(session.notes)
                    const isLongNotes = plainText.length > NOTES_PREVIEW_LIMIT
                    const isNotesExpanded = Boolean(expandedNotesIds[session.id])

                    return (
                      <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-1.5">
                        <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-emerald-400/90">
                          <NotebookPen className="w-3.5 h-3.5 shrink-0" />
                          <span>Anotações de leitura</span>
                        </div>
                        <div className={!isNotesExpanded && isLongNotes ? 'max-h-24 overflow-hidden relative' : ''}>
                          <RichTextViewer content={session.notes} className="text-xs" />
                          {!isNotesExpanded && isLongNotes && (
                            <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-950/95 to-transparent pointer-events-none" />
                          )}
                        </div>
                        {isLongNotes && (
                          <button
                            type="button"
                            onClick={() => toggleNotesExpanded(session.id)}
                            className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition cursor-pointer pt-0.5"
                          >
                            {isNotesExpanded ? 'Mostrar menos' : 'Ler mais'}
                          </button>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal para Confirmar Exclusão */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-sm max-h-[90dvh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Excluir Registro de Leitura</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tem certeza que deseja apagar esta sessão de leitura? As páginas lidas não serão recalculadas no livro da estante.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setSessionToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteSession(sessionToDelete)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition cursor-pointer flex items-center space-x-1.5"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Registro / Edição de Sessão */}
      <LogSessionModal
        isOpen={isLogModalOpen || Boolean(sessionToEdit)}
        onClose={() => {
          setIsLogModalOpen(false)
          setSessionToEdit(null)
        }}
        editingSession={sessionToEdit}
        availableBooks={activeBooks}
        onSuccess={handleSessionLogged}
      />
    </div>
  )
}
