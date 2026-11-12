import { useState } from 'react'
import { updateGoal } from '@/api/goals'
import { Loader2, Target, X } from 'lucide-react'

interface SetGoalModalProps {
  currentTarget: number
  isOpen: boolean
  onClose: () => void
  onSuccess: (newTarget: number) => void
}

const presets = [10, 15, 20, 30, 50]

export function SetGoalModal({
  currentTarget,
  isOpen,
  onClose,
  onSuccess,
}: SetGoalModalProps) {
  const [target, setTarget] = useState(currentTarget)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (target < 1) {
      setError('A meta deve ser de pelo menos 1 pagina por dia')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const res = await updateGoal(target)
      onSuccess(res.daily_page_target)
      onClose()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Erro ao salvar meta')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="relative w-full max-w-sm max-h-[90dvh] flex flex-col overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="shrink-0 flex items-center justify-between px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Target className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Definir Meta Diaria</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
            <p className="text-xs text-slate-400">
              Escolha quantas paginas voce deseja ler diariamente para manter sua frequencia.
            </p>

            {error && (
              <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl">
                {error}
              </div>
            )}

            <div className="flex items-center justify-center space-x-2">
              {presets.map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setTarget(val)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    target === val
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {val}p
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Paginas por dia</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={target}
                onChange={(e) => setTarget(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-sm font-bold text-center text-white focus:outline-hidden transition"
              />
            </div>
          </div>

          <div className="shrink-0 flex items-center justify-end space-x-3 px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-800 bg-slate-900/95">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || target < 1}
              className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-medium text-sm transition cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Salvar Meta</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
