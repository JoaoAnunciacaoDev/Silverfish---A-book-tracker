import { useState, useEffect } from 'react'
import { getPublishedPatchNotes } from '@/api/patchNotes'
import type { PatchNote } from '@/types/patchNotes'
import { X, Sparkles, Rocket, Zap, Wrench, Calendar, Tag } from 'lucide-react'

interface PatchNotesModalProps {
  onClose: () => void
}

export function PatchNotesModal({ onClose }: PatchNotesModalProps) {
  const [patchNotes, setPatchNotes] = useState<PatchNote[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    getPublishedPatchNotes()
      .then((data) => {
        if (isMounted) setPatchNotes(data.patch_notes || [])
      })
      .catch((err) => {
        console.error('Erro ao carregar patch notes:', err)
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const parseChanges = (jsonStr: string) => {
    try {
      return JSON.parse(jsonStr) || {}
    } catch {
      return {}
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Notas de Atualização</h3>
              <p className="text-xs text-slate-400">Histórico de versões e novidades da plataforma</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-full transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista de Versões */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 text-xs animate-pulse">
              Carregando notas de versão...
            </div>
          ) : patchNotes.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              Nenhuma nota de atualização publicada ainda.
            </div>
          ) : (
            patchNotes.map((note, index) => {
              const changes = parseChanges(note.changes_json)
              const isLatest = index === 0

              return (
                <div
                  key={note.id}
                  className={`p-5 rounded-3xl border transition ${
                    isLatest
                      ? 'bg-gradient-to-b from-emerald-950/20 via-slate-900 to-slate-900 border-emerald-500/30 shadow-lg shadow-emerald-500/5'
                      : 'bg-slate-900/70 border-slate-800'
                  }`}
                >
                  {/* Cabeçalho da Versão */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-extrabold px-2.5 py-1 rounded-xl bg-slate-800 text-emerald-400 border border-slate-700">
                        <Tag className="w-3 h-3" />
                        {note.version}
                      </span>
                      <h4 className="text-sm font-bold text-white">{note.title}</h4>
                      {isLatest && (
                        <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          Versão Atual
                        </span>
                      )}
                    </div>

                    {note.published_at && (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(note.published_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 mb-4 leading-relaxed">{note.summary}</p>

                  {/* Seções de Mudanças */}
                  <div className="space-y-3 pt-2 border-t border-slate-800/80">
                    {/* Novidades */}
                    {changes.features && changes.features.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-1.5">
                          <Rocket className="w-3.5 h-3.5" />
                          <span>Novidades</span>
                        </div>
                        <ul className="space-y-1 pl-5 list-disc text-xs text-slate-300">
                          {changes.features.map((item: string, i: number) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Melhorias */}
                    {changes.improvements && changes.improvements.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400 mb-1.5">
                          <Zap className="w-3.5 h-3.5" />
                          <span>Melhorias</span>
                        </div>
                        <ul className="space-y-1 pl-5 list-disc text-xs text-slate-300">
                          {changes.improvements.map((item: string, i: number) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Correções */}
                    {changes.fixes && changes.fixes.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1.5">
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Correções</span>
                        </div>
                        <ul className="space-y-1 pl-5 list-disc text-xs text-slate-300">
                          {changes.fixes.map((item: string, i: number) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
