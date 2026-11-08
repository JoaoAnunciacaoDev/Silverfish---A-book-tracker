import type { ExternalBookItem } from '@/types/book'
import { BookOpen, Calendar, Download, Layers, Loader2 } from 'lucide-react'

interface ExternalBookCardProps {
  item: ExternalBookItem
  onImport: (item: ExternalBookItem) => void
  isImporting: boolean
}

export function ExternalBookCard({ item, onImport, isImporting }: ExternalBookCardProps) {
  return (
    <div className="flex flex-col justify-between bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 transition-all duration-200 hover:border-slate-700">
      <div className="flex gap-4">
        {/* Capa Open Library */}
        <div className="w-20 h-28 sm:w-24 sm:h-34 shrink-0 rounded-xl overflow-hidden bg-slate-800 border border-slate-700/50 flex items-center justify-center relative">
          {item.cover_url ? (
            <img
              src={item.cover_url}
              alt={item.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500 p-2 text-center">
              <BookOpen className="w-8 h-8 text-slate-600 mb-1" />
              <span className="text-[10px] leading-tight font-medium">Sem capa</span>
            </div>
          )}
        </div>

        {/* Detalhes */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-white text-base leading-snug line-clamp-2">
              {item.title}
            </h3>
            <p className="text-sm text-slate-400 truncate">{item.author}</p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/40 text-slate-300 text-xs font-medium">
              <Layers className="w-3 h-3 text-emerald-400" />
              ~{item.page_count} págs
            </span>

            {item.year > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/40 text-slate-300 text-xs font-medium">
                <Calendar className="w-3 h-3 text-sky-400" />
                {item.year}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Ação: Adicionar à Estante */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
        {item.isbn ? (
          <span className="text-[11px] text-slate-500 font-medium truncate max-w-[120px]">
            ISBN {item.isbn}
          </span>
        ) : (
          <span className="text-[11px] text-slate-500 font-medium">
            Busca Online
          </span>
        )}

        <button
          onClick={() => onImport(item)}
          disabled={isImporting}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white disabled:text-slate-500 text-xs font-semibold transition cursor-pointer disabled:cursor-not-allowed shrink-0 shadow-sm"
        >
          {isImporting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Adicionando...</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>Adicionar à Estante</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
