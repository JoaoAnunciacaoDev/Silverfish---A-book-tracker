import { useEffect, useState, useCallback } from 'react'
import {
  createBookReview,
  listBookReviews,
  updateReview,
  deleteReview,
} from '@/api/reviews'
import type { BookReview } from '@/types/review'
import type { UserBook } from '@/types/library'
import {
  Calendar,
  Clock,
  Edit2,
  Loader2,
  MessageSquare,
  Plus,
  Star,
  Trash2,
  X,
} from 'lucide-react'

interface ReviewModalProps {
  item: UserBook | null
  isOpen: boolean
  onClose: () => void
  currentUserId?: string
}

export function ReviewModal({ item, isOpen, onClose, currentUserId }: ReviewModalProps) {
  const [reviews, setReviews] = useState<BookReview[]>([])
  const [average, setAverage] = useState(0)
  const [count, setCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [rating, setRating] = useState<number>(10)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null)
  const [isFormVisible, setIsFormVisible] = useState(false)

  const fetchReviews = useCallback(async () => {
    if (!item?.book?.id) return
    try {
      setIsLoading(true)
      const res = await listBookReviews(item.book.id)
      setReviews(res.reviews || [])
      setAverage(res.average || 0)
      setCount(res.count || 0)

      // Se não há avaliações ainda, já abre o formulário
      if (!res.reviews || res.reviews.length === 0) {
        setIsFormVisible(true)
      }
    } catch {
      // Ignora erro
    } finally {
      setIsLoading(false)
    }
  }, [item?.book?.id])

  useEffect(() => {
    if (isOpen && item) {
      setError(null)
      setRating(10)
      setComment('')
      setEditingReviewId(null)
      setIsFormVisible(false)
      fetchReviews()
    }
  }, [isOpen, item, fetchReviews])

  if (!isOpen || !item) return null

  const handleStartEdit = (rev: BookReview) => {
    setEditingReviewId(rev.id)
    setRating(rev.rating)
    setComment(rev.comment || '')
    setIsFormVisible(true)
  }

  const handleCancelForm = () => {
    setEditingReviewId(null)
    setRating(10)
    setComment('')
    if (reviews.length > 0) {
      setIsFormVisible(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSubmitting(true)
      setError(null)

      if (editingReviewId) {
        await updateReview(editingReviewId, {
          rating,
          comment: comment.trim(),
        })
      } else {
        await createBookReview(item.book.id, {
          rating,
          comment: comment.trim(),
        })
      }

      handleCancelForm()
      await fetchReviews()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Erro ao salvar avaliação')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (reviewId: string) => {
    if (!confirm('Deseja realmente excluir esta avaliação?')) return
    try {
      await deleteReview(reviewId)
      await fetchReviews()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      }
    }
  }

  const formatDate = (iso: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const currentDisplayRating = hoverRating !== null ? hoverRating : rating

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Avaliações do Livro</h3>
              <p className="text-xs text-slate-400 truncate max-w-sm">{item.book.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body scrollable */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl">
              {error}
            </div>
          )}

          {/* Resumo da Nota */}
          <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center space-x-3">
              <div className="text-3xl font-extrabold text-amber-400">
                {count > 0 ? average.toFixed(1) : '-'}
              </div>
              <div>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((starVal) => (
                    <Star
                      key={starVal}
                      className={`w-3.5 h-3.5 ${
                        starVal <= Math.round(average)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {count} {count === 1 ? 'avaliação registrada' : 'avaliações registradas'}
                </p>
              </div>
            </div>

            {!isFormVisible && (
              <button
                onClick={() => setIsFormVisible(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-semibold hover:bg-amber-500/20 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Avaliação</span>
              </button>
            )}
          </div>

          {/* Formulário de Avaliação (Nova ou Edição) */}
          {isFormVisible && (
            <form
              onSubmit={handleSubmit}
              className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-4.5 space-y-4 animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-amber-300">
                  {editingReviewId ? 'Editar Avaliação' : 'Registrar Avaliação (0 a 10)'}
                </span>
                <span className="text-sm font-extrabold text-amber-400">
                  {currentDisplayRating} / 10
                </span>
              </div>

              {/* Seletor de Estrelas (0 a 10) */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Sua Nota em Estrelas</label>
                <div className="flex items-center space-x-1 py-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setRating(num)}
                      onMouseEnter={() => setHoverRating(num)}
                      onMouseLeave={() => setHoverRating(null)}
                      className="p-1 text-slate-600 hover:scale-125 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          num <= currentDisplayRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-700'
                        }`}
                      />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setRating(0)}
                    className="ml-2 text-[10px] text-slate-500 hover:text-slate-300 underline cursor-pointer"
                  >
                    Nota 0
                  </button>
                </div>
              </div>

              {/* Comentário (limitado a 1000 caracteres) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-medium text-slate-300">Comentário ou Resenha</label>
                  <span
                    className={`text-[11px] font-mono ${
                      comment.length > 1000 ? 'text-rose-400 font-bold' : 'text-slate-500'
                    }`}
                  >
                    {comment.length} / 1000
                  </span>
                </div>
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Escreva sua reflexão, resenha ou análise sobre o livro..."
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden transition resize-y"
                />
              </div>

              {/* Ações do Formulário */}
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || comment.length > 1000}
                  className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 font-bold text-xs transition cursor-pointer disabled:cursor-not-allowed shadow-sm"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingReviewId ? 'Atualizar Avaliação' : 'Publicar Avaliação'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Lista de Avaliações Registradas */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Histórico de Avaliações ({reviews.length})
            </h4>

            {isLoading ? (
              <div className="py-6 text-center text-xs text-slate-500 animate-pulse">
                Carregando avaliações...
              </div>
            ) : reviews.length === 0 ? (
              <div className="py-8 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl text-xs text-slate-500">
                <MessageSquare className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                Nenhuma avaliação cadastrada ainda para este livro.
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev) => {
                  const isMine = currentUserId ? rev.user_id === currentUserId : true
                  const isEdited = rev.updated_at && rev.created_at !== rev.updated_at

                  return (
                    <div
                      key={rev.id}
                      className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-2.5 transition hover:border-slate-700"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-0.5">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                              <Star
                                key={s}
                                className={`w-3 h-3 ${
                                  s <= rev.rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-800'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-extrabold text-amber-400">
                            {rev.rating}/10
                          </span>
                        </div>

                        {/* Ações para o dono da avaliação */}
                        {isMine && (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleStartEdit(rev)}
                              className="p-1 text-slate-500 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                              title="Editar avaliação"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(rev.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                              title="Excluir avaliação"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {rev.comment && (
                        <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {rev.comment}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[10px] text-slate-500 border-t border-slate-900">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-600" />
                          Criado: {formatDate(rev.created_at)}
                        </span>
                        {isEdited && (
                          <span className="inline-flex items-center gap-1 text-amber-500/80">
                            <Clock className="w-3 h-3" />
                            Editado: {formatDate(rev.updated_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
