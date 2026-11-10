import { useState, useEffect } from 'react'
import { createBook } from '@/api/books'
import type { Book as BookType, CreateBookInput } from '@/types/book'
import { BookPlus, Loader2, X } from 'lucide-react'

interface CreateBookModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newBook: BookType) => void
  initialTitle?: string
}

export function CreateBookModal({ isOpen, onClose, onSuccess, initialTitle = '' }: CreateBookModalProps) {
  const [form, setForm] = useState<CreateBookInput>({
    title: initialTitle,
    author: '',
    page_count: 200,
    genre: '',
    cover_url: '',
    isbn: '',
    description: '',
    add_to_shelf: true,
    shelf_status: 'want_to_read',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && initialTitle) {
      setForm((prev) => ({ ...prev, title: initialTitle }))
    }
  }, [isOpen, initialTitle])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.title.trim()) {
      setError('O título do livro é obrigatório')
      return
    }
    if (!form.author.trim()) {
      setError('O autor do livro é obrigatório')
      return
    }
    if (form.page_count <= 0) {
      setError('O livro deve ter pelo menos 1 página')
      return
    }

    try {
      setIsLoading(true)
      const res = await createBook(form)
      onSuccess(res.book)
      onClose()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Ocorreu um erro ao cadastrar o livro')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <BookPlus className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Cadastrar Livro Manual</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-medium text-slate-300">Título *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: O Hobbit"
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Autor *</label>
              <input
                type="text"
                required
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                placeholder="Ex: J.R.R. Tolkien"
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Páginas *</label>
              <input
                type="number"
                min="1"
                required
                value={form.page_count}
                onChange={(e) => setForm({ ...form, page_count: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Gênero</label>
              <input
                type="text"
                value={form.genre}
                onChange={(e) => setForm({ ...form, genre: e.target.value })}
                placeholder="Ex: Fantasia, Ficção"
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">ISBN</label>
              <input
                type="text"
                value={form.isbn}
                onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                placeholder="Ex: 9788595084742"
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden transition"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-medium text-slate-300">URL da Imagem da Capa</label>
              <input
                type="url"
                value={form.cover_url}
                onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden transition"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-medium text-slate-300">Descrição / Sinopse</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Breve resumo da obra..."
                className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden transition resize-none"
              />
            </div>

            <div className="sm:col-span-2 p-3 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2">
              <label className="flex items-center space-x-2 text-xs font-semibold text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.add_to_shelf}
                  onChange={(e) => setForm({ ...form, add_to_shelf: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded bg-slate-900 border-slate-700 focus:ring-emerald-500"
                />
                <span>Adicionar imediatamente à minha estante</span>
              </label>

              {form.add_to_shelf && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-400">Status inicial:</span>
                  <select
                    value={form.shelf_status}
                    onChange={(e) => setForm({ ...form, shelf_status: e.target.value })}
                    className="px-2.5 py-1 bg-slate-900 border border-slate-700 text-xs text-white rounded-lg focus:outline-hidden"
                  >
                    <option value="want_to_read">Quero Ler</option>
                    <option value="reading">Lendo Agora</option>
                    <option value="read">Já Lido</option>
                  </select>
                </div>
              )}
            </div>
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
              className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-medium text-sm transition cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Salvar Livro</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
