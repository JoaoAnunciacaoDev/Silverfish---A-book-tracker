import { ArrowLeft, BookOpen, Home } from 'lucide-react'

interface NotFoundPageProps {
  path: string
  isAuthenticated: boolean
  onGoHome: () => void
}

export function NotFoundPage({ path, isAuthenticated, onGoHome }: NotFoundPageProps) {
  const canGoBack = typeof window !== 'undefined' && window.history.length > 1

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back()
    } else {
      onGoHome()
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/30">
            <BookOpen className="w-8 h-8" />
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Erro 404
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Página não encontrada
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Parece que este capítulo foi arrancado do livro. O endereço acessado não existe ou foi movido.
          </p>
        </div>

        {path && (
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 font-mono truncate">
            {path}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onGoHome}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition cursor-pointer shadow-lg shadow-emerald-500/20"
          >
            <Home className="w-4 h-4" />
            <span>{isAuthenticated ? 'Voltar para Minha Estante' : 'Ir para o início'}</span>
          </button>

          {canGoBack && (
            <button
              type="button"
              onClick={handleGoBack}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
