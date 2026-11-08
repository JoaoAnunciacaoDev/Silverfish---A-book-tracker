import type { Book as BookType } from '@/types/book'
import { BookOpen, Layers, Tag } from 'lucide-react'

interface BookCardProps {
  book: BookType
  onSelect?: (book: BookType) => void
}

export function BookCard({ book, onSelect }: BookCardProps) {
  return (
    <div
      onClick={() => onSelect?.(book)}
      className="group relative flex flex-col bg-slate-900/80 border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl p-4 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-950/20 hover:-translate-y-0.5 cursor-pointer"
    >
      <div className="flex gap-4">
        {/* Capa ou Placeholder */}
        <div className="w-20 h-28 sm:w-24 sm:h-34 shrink-0 rounded-xl overflow-hidden bg-slate-800 border border-slate-700/50 flex items-center justify-center relative shadow-inner">
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={book.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500 p-2 text-center">
              <BookOpen className="w-8 h-8 text-slate-600 mb-1" />
              <span className="text-[10px] leading-tight font-medium line-clamp-2">Sem capa</span>
            </div>
          )}
        </div>

        {/* Informações Principais */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-white text-base leading-snug line-clamp-2 group-hover:text-emerald-400 transition-colors">
              {book.title}
            </h3>
            <p className="text-sm text-slate-400 truncate">{book.author}</p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/40 text-slate-300 text-xs font-medium">
              <Layers className="w-3 h-3 text-emerald-400" />
              {book.page_count} págs
            </span>

            {book.genre && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium truncate max-w-[120px]">
                <Tag className="w-2.5 h-2.5" />
                {book.genre}
              </span>
            )}
          </div>
        </div>
      </div>

      {book.description && (
        <p className="mt-3 text-xs text-slate-400 line-clamp-2 leading-relaxed border-t border-slate-800/60 pt-2.5">
          {book.description}
        </p>
      )}
    </div>
  )
}
