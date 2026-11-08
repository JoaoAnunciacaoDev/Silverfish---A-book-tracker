import { AuthProvider, useAuth } from '@/features/auth/AuthContext'
import { AuthPage } from '@/features/auth/AuthPage'
import { BookOpen, LogOut, Sparkles, User as UserIcon, Clock } from 'lucide-react'

function Dashboard() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Silverfish</span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-700/50 text-xs">
              <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-medium text-slate-200">{user?.display_name}</span>
              <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                {user?.role}
              </span>
            </div>

            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition border border-transparent hover:border-rose-500/20 cursor-pointer"
              title="Sair da conta"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-6">
        <div className="bg-linear-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/20 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center space-x-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sessão ativa com Cookies HttpOnly</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Olá, {user?.display_name}! 📖
            </h2>
            <p className="text-slate-400 text-sm max-w-xl">
              Você está autenticado com sucesso no Silverfish. Sua conta está associada ao usuário{' '}
              <strong className="text-slate-200">@{user?.username}</strong> ({user?.email}).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <UserIcon className="w-4 h-4 text-emerald-400" />
              <span>Identificação</span>
            </div>
            <p className="text-sm font-mono text-slate-300 break-all">{user?.id}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Fuso Horário IANA</span>
            </div>
            <p className="text-sm font-semibold text-slate-200">{user?.timezone}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>Próximo Passo</span>
            </div>
            <p className="text-sm text-emerald-400 font-medium">Etapa 5: Catálogo de Livros</p>
          </div>
        </div>
      </main>
    </div>
  )
}

function Main() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">
        <p className="animate-pulse text-sm">Carregando sessão...</p>
      </div>
    )
  }

  return isAuthenticated ? <Dashboard /> : <AuthPage />
}

export function App() {
  return (
    <AuthProvider>
      <Main />
    </AuthProvider>
  )
}

export default App
