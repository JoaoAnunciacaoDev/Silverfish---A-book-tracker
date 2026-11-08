import { useEffect, useState } from 'react'
import { deleteReadingSession, listReadingSessions } from '@/api/reading'
import type { ReadingSession } from '@/types/reading'
import { Calendar, Clock, Loader2, Trash2, X } from 'lucide-react'

interface ReadingHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSessionDeleted?: () => void
}

export function ReadingHistoryModal({
  isOpen,
  onClose,
  onSessionDeleted,
}: ReadingHistoryModalProps) {
  const [sessions, setSessions] = useState<ReadingSession[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      listReadingSessions()
        .then((res) => setSessions(res.sessions))
        .catch(() => {})
        .finally(() => setIsLoading(false))
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta sessao de leitura?')) return
    try {
      setDeletingId(id)
      await deleteReadingSession(id)
      setSessions((prev) => prev.filter((s) => s.id !== id))
      onSessionDeleted?.()
    } catch {
      alert('Erro ao excluir sessao')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="relative w-full max-w-xl max-h-[85vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Historico de Leituras</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <p className="text-xs">Carregando sessoes...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Nenhuma sessao de leitura registrada ainda.
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex items-start justify-between gap-3"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="font-semibold text-white truncate">
                      {session.user_book?.book?.title || 'Livro'}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-emerald-400 font-bold">
                      +{session.pages_read} pags
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      (pags {session.start_page} a {session.end_page})
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{session.read_at}</span>
                    </span>
                    {session.feeling && (
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                        {session.feeling}
                      </span>
                    )}
                  </div>

                  {session.notes && (
                    <p className="text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80 mt-1.5 italic">
                      "{session.notes}"
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(session.id)}
                  disabled={deletingId === session.id}
                  className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
                  title="Excluir sessao"
                >
                  {deletingId === session.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
