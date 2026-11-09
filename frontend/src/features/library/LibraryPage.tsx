import { useState, useEffect, useCallback } from 'react'
import {
  listLibrary,
  updateLibraryBook,
  deleteLibraryBook,
  toggleFavorite,
} from '@/api/library'
import type { LibrarySummary, UserBook, UserBookStatus } from '@/types/library'
import { LibraryBookCard } from './LibraryBookCard'
import { UpdateProgressModal } from './UpdateProgressModal'
import { LogSessionModal } from '@/features/reading/LogSessionModal'
import { ReadingHistoryModal } from '@/features/reading/ReadingHistoryModal'
import { ReviewModal } from '@/features/reviews/ReviewModal'
import { DailyGoalWidget } from '@/features/goals/DailyGoalWidget'
import { StreakWidget } from '@/features/goals/StreakWidget'
import {
  Archive,
  BookMarked,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  Heart,
  History,
  Library,
  Loader2,
  Pause,
  Search,
} from 'lucide-react'

interface LibraryPageProps {
  onNavigateToCatalog: () => void
}

export function LibraryPage({ onNavigateToCatalog }: LibraryPageProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | UserBookStatus | 'favorites'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [items, setItems] = useState<UserBook[]>([])
  const [summary, setSummary] = useState<LibrarySummary>({
    total: 0,
    reading: 0,
    want_to_read: 0,
    read: 0,
    paused: 0,
    abandoned: 0,
    in_collection: 0,
    favorites: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [selectedBookForProgress, setSelectedBookForProgress] = useState<UserBook | null>(null)
  const [selectedBookForSession, setSelectedBookForSession] = useState<UserBook | null>(null)
  const [selectedBookForReview, setSelectedBookForReview] = useState<UserBook | null>(null)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [goalRefreshKey, setGoalRefreshKey] = useState(0)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const fetchLibrary = useCallback(async () => {
    try {
      setIsLoading(true)
      const params: { status?: string; favorite?: boolean; q?: string } = {}

      if (activeFilter === 'favorites') {
        params.favorite = true
      } else if (activeFilter !== 'all') {
        params.status = activeFilter
      }

      if (searchQuery.trim()) {
        params.q = searchQuery.trim()
      }

      const res = await listLibrary(params)
      setItems(res.items)
      setSummary(res.summary)
    } catch {
      // Ignora erro
    } finally {
      setIsLoading(false)
    }
  }, [activeFilter, searchQuery])

  useEffect(() => {
    fetchLibrary()
  }, [fetchLibrary])

  // Ações da Estante
  const handleUpdateProgress = async (id: string, newPage: number) => {
    const res = await updateLibraryBook(id, { current_page: newPage })
    setItems((prev) => prev.map((item) => (item.id === id ? res.item : item)))
    showToast(`Progresso de "${res.item.book.title}" atualizado para pagina ${newPage}`)
    setGoalRefreshKey((k) => k + 1)
    fetchLibrary()
  }

  const handleSessionLogged = (session: { user_book: UserBook; pages_read: number }) => {
    setItems((prev) =>
      prev.map((i) => (i.id === session.user_book.id ? session.user_book : i))
    )
    showToast(`Sessao registrada: +${session.pages_read} paginas lidas`)
    setGoalRefreshKey((k) => k + 1)
    fetchLibrary()
  }

  const handleChangeStatus = async (item: UserBook, newStatus: UserBookStatus) => {
    try {
      const res = await updateLibraryBook(item.id, { status: newStatus })
      setItems((prev) => prev.map((i) => (i.id === item.id ? res.item : i)))
      showToast(`"${item.book.title}" movido para nova categoria`)
      fetchLibrary()
    } catch {
      showToast('Erro ao atualizar status do livro')
    }
  }

  const handleToggleFavorite = async (id: string) => {
    try {
      const res = await toggleFavorite(id)
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, favorite: res.favorite } : i))
      )
      showToast(res.favorite ? 'Adicionado aos favoritos' : 'Removido dos favoritos')
      fetchLibrary()
    } catch {
      showToast('Erro ao alternar favorito')
    }
  }

  const handleRemove = async (id: string) => {
    try {
      await deleteLibraryBook(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
      showToast('Livro removido da sua estante.')
      fetchLibrary()
    } catch {
      showToast('Erro ao remover livro da estante')
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-4">
          <BookOpen className="w-5 h-5" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Widgets de Metas e Streaks (Etapa 8) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DailyGoalWidget refreshTrigger={goalRefreshKey} />
        <StreakWidget refreshTrigger={goalRefreshKey} />
      </div>

      {/* Header com métricas rápidas e atalho para histórico de sessões */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
            <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold">
              <BookMarked className="w-3.5 h-3.5 text-emerald-400" />
              <span>Na Estante</span>
            </div>
            <p className="text-xl font-bold text-white">{summary.total}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
            <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Lendo</span>
            </div>
            <p className="text-xl font-bold text-emerald-400">{summary.reading}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
            <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Concluidos</span>
            </div>
            <p className="text-xl font-bold text-indigo-400">{summary.read}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-1">
            <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold">
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              <span>Favoritos</span>
            </div>
            <p className="text-xl font-bold text-rose-400">{summary.favorites}</p>
          </div>
        </div>

        <button
          onClick={() => setIsHistoryOpen(true)}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer self-start sm:self-center"
        >
          <History className="w-4 h-4 text-emerald-400" />
          <span>Historico de Sessoes</span>
        </button>
      </div>

      {/* Filtros por Abas e Busca Interna */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              activeFilter === 'all'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todos ({summary.total})
          </button>

          <button
            onClick={() => setActiveFilter('reading')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
              activeFilter === 'reading'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Lendo ({summary.reading})</span>
          </button>

          <button
            onClick={() => setActiveFilter('want_to_read')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
              activeFilter === 'want_to_read'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Quero Ler ({summary.want_to_read})</span>
          </button>

          <button
            onClick={() => setActiveFilter('read')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
              activeFilter === 'read'
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Lidos ({summary.read})</span>
          </button>

          <button
            onClick={() => setActiveFilter('in_collection')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
              activeFilter === 'in_collection'
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Coleção ({summary.in_collection})</span>
          </button>

          <button
            onClick={() => setActiveFilter('paused')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
              activeFilter === 'paused'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Pause className="w-3.5 h-3.5" />
            <span>Pausados ({summary.paused})</span>
          </button>

          <button
            onClick={() => setActiveFilter('favorites')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
              activeFilter === 'favorites'
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
            <span>Favoritos ({summary.favorites})</span>
          </button>
        </div>

        <div className="relative sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar sua estante..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden transition"
          />
        </div>
      </div>

      {/* Lista de Livros */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <p className="text-sm">Carregando sua estante...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-800 rounded-3xl p-8 space-y-4">
          <Library className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white">Nenhum livro nesta estante</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? `Nenhum livro corresponde a "${searchQuery}".`
                : 'Sua estante ainda não possui livros nesta categoria. Busque ou cadastre novas obras para começar!'}
            </p>
          </div>
          <button
            onClick={onNavigateToCatalog}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>Buscar Livros para a Estante</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <LibraryBookCard
              key={item.id}
              item={item}
              onUpdateProgress={(book) => setSelectedBookForProgress(book)}
              onLogSession={(book) => setSelectedBookForSession(book)}
              onChangeStatus={handleChangeStatus}
              onToggleFavorite={handleToggleFavorite}
              onRemove={handleRemove}
              onOpenReview={(book) => setSelectedBookForReview(book)}
            />
          ))}
        </div>
      )}

      {/* Modal de Avaliações / Resenhas */}
      <ReviewModal
        item={selectedBookForReview}
        isOpen={Boolean(selectedBookForReview)}
        onClose={() => setSelectedBookForReview(null)}
      />

      {/* Modal de Atualização de Progresso */}
      <UpdateProgressModal
        item={selectedBookForProgress}
        isOpen={Boolean(selectedBookForProgress)}
        onClose={() => setSelectedBookForProgress(null)}
        onUpdate={handleUpdateProgress}
      />

      {/* Modal de Registrar Sessao de Leitura (Etapa 7) */}
      <LogSessionModal
        item={selectedBookForSession}
        isOpen={Boolean(selectedBookForSession)}
        onClose={() => setSelectedBookForSession(null)}
        onSuccess={handleSessionLogged}
      />

      {/* Modal de Historico de Sessoes (Etapa 7) */}
      <ReadingHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSessionDeleted={() => {
          fetchLibrary()
          setGoalRefreshKey((k) => k + 1)
        }}
      />
    </div>
  )
}
