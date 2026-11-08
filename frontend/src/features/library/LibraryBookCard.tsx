import type { UserBook, UserBookStatus } from '@/types/library'
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Heart,
  MoreVertical,
  Pause,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'

interface LibraryBookCardProps {
  item: UserBook
  onUpdateProgress: (item: UserBook) => void
  onLogSession?: (item: UserBook) => void
  onChangeStatus: (item: UserBook, newStatus: UserBookStatus) => void
  onToggleFavorite: (id: string) => void
  onRemove: (id: string) => void
}

const statusConfig: Record<
  UserBookStatus,
  { label: string; bg: string; text: string; border: string; icon: typeof BookOpen }
> = {
  reading: {
    label: 'Lendo',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    icon: BookOpen,
  },
  want_to_read: {
    label: 'Quero Ler',
    bg: 'bg-sky-500/10',
    text: 'text-sky-400',
    border: 'border-sky-500/20',
    icon: Clock,
  },
  read: {
    label: 'Lido',
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    border: 'border-indigo-500/20',
    icon: CheckCircle2,
  },
  paused: {
    label: 'Pausado',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    icon: Pause,
  },
  abandoned: {
    label: 'Abandonado',
    bg: 'bg-slate-800',
    text: 'text-slate-400',
    border: 'border-slate-700',
    icon: XCircle,
  },
}

export function LibraryBookCard({
  item,
  onUpdateProgress,
  onLogSession,
  onChangeStatus,
  onToggleFavorite,
  onRemove,
}: LibraryBookCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const currentConfig = statusConfig[item.status] || statusConfig.want_to_read
  const StatusIcon = currentConfig.icon
  const totalPages = item.book.page_count || 100
  const percentage = Math.min(100, Math.round((item.current_page / totalPages) * 100))

  return (
    <div className="group relative flex flex-col justify-between bg-slate-900/90 border border-slate-800 rounded-2xl p-4 transition-all duration-200 hover:border-slate-700 hover:shadow-lg">
      <div>
        <div className="flex gap-4">
          {/* Capa */}
          <div className="w-20 h-28 sm:w-24 sm:h-34 shrink-0 rounded-xl overflow-hidden bg-slate-800 border border-slate-700/50 flex items-center justify-center relative shadow-inner">
            {item.book.cover_url ? (
              <img
                src={item.book.cover_url}
                alt={item.book.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 p-2 text-center">
                <BookOpen className="w-8 h-8 text-slate-600 mb-1" />
                <span className="text-[10px] leading-tight font-medium">Sem capa</span>
              </div>
            )}
          </div>

          {/* Dados */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-1">
                <h3 className="font-semibold text-white text-base leading-snug line-clamp-2">
                  {item.book.title}
                </h3>

                {/* Favorito */}
                <button
                  onClick={() => onToggleFavorite(item.id)}
                  className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer shrink-0"
                  title={item.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                >
                  <Heart
                    className={`w-4 h-4 transition-transform active:scale-125 ${
                      item.favorite ? 'fill-rose-500 text-rose-500' : 'hover:text-rose-400'
                    }`}
                  />
                </button>
              </div>

              <p className="text-sm text-slate-400 truncate">{item.book.author}</p>
            </div>

            {/* Status Pill Badge */}
            <div className="pt-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${currentConfig.bg} ${currentConfig.text} ${currentConfig.border}`}
              >
                <StatusIcon className="w-3.5 h-3.5" />
                <span>{currentConfig.label}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Progresso de leitura (apenas quando Lendo ou se tiver páginas lidas) */}
        {item.status === 'reading' && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Progresso</span>
              <span className="font-semibold text-emerald-400">
                Pág. {item.current_page} de {totalPages} ({percentage}%)
              </span>
            </div>

            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Ações inferiores */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 relative">
        {item.status === 'reading' ? (
          <div className="flex-1 flex items-center space-x-1.5">
            <button
              onClick={() => onLogSession ? onLogSession(item) : onUpdateProgress(item)}
              className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer text-center"
            >
              Registrar Leitura
            </button>
            <button
              onClick={() => onUpdateProgress(item)}
              className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer text-center"
              title="Ajuste direto de página"
            >
              Ajustar
            </button>
          </div>
        ) : (
          <span className="text-xs text-slate-500">
            {item.book.page_count} páginas
          </span>
        )}

        {/* Menu de Opções / Mudar Status */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Mais opções"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 bottom-full mb-2 z-30 w-44 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 shadow-2xl space-y-1 text-xs">
                <div className="px-2 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Mover Para
                </div>

                {item.status !== 'reading' && (
                  <button
                    onClick={() => {
                      onChangeStatus(item, 'reading')
                      setShowMenu(false)
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center space-x-2"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Lendo Agora</span>
                  </button>
                )}

                {item.status !== 'want_to_read' && (
                  <button
                    onClick={() => {
                      onChangeStatus(item, 'want_to_read')
                      setShowMenu(false)
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center space-x-2"
                  >
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    <span>Quero Ler</span>
                  </button>
                )}

                {item.status !== 'read' && (
                  <button
                    onClick={() => {
                      onChangeStatus(item, 'read')
                      setShowMenu(false)
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center space-x-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Marcar como Lido</span>
                  </button>
                )}

                {item.status !== 'paused' && (
                  <button
                    onClick={() => {
                      onChangeStatus(item, 'paused')
                      setShowMenu(false)
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center space-x-2"
                  >
                    <Pause className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pausar Leitura</span>
                  </button>
                )}

                <div className="border-t border-slate-800 my-1" />

                <button
                  onClick={() => {
                    if (confirm(`Remover "${item.book.title}" da sua estante?`)) {
                      onRemove(item.id)
                    }
                    setShowMenu(false)
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition flex items-center space-x-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remover da Estante</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
