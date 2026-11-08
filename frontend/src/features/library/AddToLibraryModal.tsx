import { useState } from 'react'
import { addToLibrary } from '@/api/library'
import type { Book } from '@/types/book'
import type { UserBook, UserBookStatus } from '@/types/library'
import { BookMarked, Check, Heart, Loader2, X } from 'lucide-react'

interface AddToLibraryModalProps {
  book: Book | null
  isOpen: boolean
  onClose: () => void
  onSuccess: (item: UserBook) => void
}

export function AddToLibraryModal({
  book,
  isOpen,
  onClose,
  onSuccess,
}: AddToLibraryModalProps) {
  if (!isOpen || !book) return null

  const [status, setStatus] = useState<UserBookStatus>('want_to_read')
  const [currentPage, setCurrentPage] = useState(0)
  const [favorite, setFavorite] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsLoading(true)
      setError(null)
      const res = await addToLibrary({
        book_id: book.id,
        status,
        current_page: status === 'reading' ? currentPage : 0,
        favorite,
      })
      onSuccess(res.item)
      onClose()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Erro ao adicionar à estante')
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
              <BookMarked className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Adicionar à Minha Estante</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center space-x-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
          <div className="w-12 h-16 bg-slate-800 rounded-lg overflow-hidden shrink-0 border border-slate-700/40">
            {book.cover_url ? (
              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500">Sem capa</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-white text-sm truncate">{book.title}</h4>
            <p className="text-xs text-slate-400 truncate">{book.author}</p>
            <span className="text-[11px] text-emerald-400 font-medium">{book.page_count} páginas</span>
          </div>
        </div>

        {error && (
          <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Escolha a Categoria</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('want_to_read')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer flex flex-col items-center gap-1 ${
                  status === 'want_to_read'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>Quero Ler</span>
                {status === 'want_to_read' && <Check className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setStatus('reading')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer flex flex-col items-center gap-1 ${
                  status === 'reading'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>Lendo Agora</span>
                {status === 'reading' && <Check className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setStatus('read')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer flex flex-col items-center gap-1 ${
                  status === 'read'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>Já Lido</span>
                {status === 'read' && <Check className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {status === 'reading' && (
            <div className="space-y-1 animate-in fade-in duration-150">
              <label className="text-xs font-medium text-slate-300">Em qual página você está?</label>
              <input
                type="number"
                min="0"
                max={book.page_count}
                value={currentPage}
                onChange={(e) => setCurrentPage(parseInt(e.target.value) || 0)}
                placeholder="Ex: 50"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-white focus:outline-hidden transition"
              />
            </div>
          )}

          <div className="flex items-center space-x-2 pt-1">
            <button
              type="button"
              onClick={() => setFavorite(!favorite)}
              className={`p-2 rounded-xl border transition cursor-pointer flex items-center space-x-2 text-xs font-medium ${
                favorite
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${favorite ? 'fill-rose-400 text-rose-400' : ''}`} />
              <span>Marcar como Favorito</span>
            </button>
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
              disabled={isLoading}
              className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-medium text-sm transition cursor-pointer disabled:cursor-not-allowed shadow-sm"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Adicionar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
