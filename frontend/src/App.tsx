import { useState } from 'react'
import { AuthProvider, useAuth } from '@/features/auth/AuthContext'
import { AuthPage } from '@/features/auth/AuthPage'
import { BookCatalogPage } from '@/features/books/BookCatalogPage'
import {
  BookMarked,
  BookOpen,
  Compass,
  Flame,
  Library,
  LogOut,
  Target,
} from 'lucide-react'

function LibraryDashboard({ onNavigateToCatalog }: { onNavigateToCatalog: () => void }) {
  const { user } = useAuth()

  return (
    <div className="space-y-8">
      {/* Banner de Boas-vindas amigável e limpo */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/20 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Olá, {user?.display_name}! 📖
          </h2>
          <p className="text-slate-400 text-sm max-w-xl">
            Acompanhe seu hábito diário de leitura, registre suas sessões e organize seus livros favoritos.
          </p>
        </div>
      </div>

      {/* Cards de Métricas da Leitura */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <BookMarked className="w-4 h-4 text-emerald-400" />
            <span>Na Estante</span>
          </div>
          <p className="text-2xl font-bold text-white">0 <span className="text-sm font-normal text-slate-400">livros</span></p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <Target className="w-4 h-4 text-emerald-400" />
            <span>Meta Diária</span>
          </div>
          <p className="text-2xl font-bold text-white">0 <span className="text-sm font-normal text-slate-400">/ 20 págs</span></p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>Sequência (Streak)</span>
          </div>
          <p className="text-2xl font-bold text-white">0 <span className="text-sm font-normal text-slate-400">dias</span></p>
        </div>
      </div>

      {/* Minha Estante */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Library className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">Minha Estante</h3>
          </div>
          <button
            onClick={onNavigateToCatalog}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
          >
            + Adicionar livros
          </button>
        </div>

        {/* Estado vazio convidativo */}
        <div className="py-16 text-center border border-dashed border-slate-800 rounded-3xl p-8 space-y-4">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h4 className="text-base font-semibold text-white">Sua estante ainda está vazia</h4>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              Explore o acervo de livros para escolher suas próximas leituras e começar a acompanhar seu progresso.
            </p>
          </div>
          <button
            onClick={onNavigateToCatalog}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition cursor-pointer shadow-sm hover:shadow-emerald-950/20"
          >
            <Compass className="w-4 h-4" />
            <span>Explorar Acervo de Livros</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function MainLayout() {
  const { user, logout } = useAuth()
  const [currentTab, setCurrentTab] = useState<'library' | 'catalog'>('library')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header limpo e profissional */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentTab('library')}>
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                <BookOpen className="w-6 h-6" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white hidden sm:inline">
                Silverfish
              </span>
            </div>

            {/* Navegação principal do usuário */}
            <nav className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentTab('library')}
                className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  currentTab === 'library'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Library className="w-4 h-4" />
                <span>Minha Estante</span>
              </button>

              <button
                onClick={() => setCurrentTab('catalog')}
                className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  currentTab === 'catalog'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Explorar Livros</span>
              </button>
            </nav>
          </div>

          {/* Perfil & Logout (sem badges internas de dev/role) */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2.5 bg-slate-800/60 pl-2 pr-3 py-1.5 rounded-full border border-slate-700/50 text-xs">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[11px]">
                {user?.display_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="font-medium text-slate-200">{user?.display_name}</span>
            </div>

            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition border border-transparent hover:border-rose-500/20 cursor-pointer"
              title="Sair da conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {currentTab === 'library' ? (
          <LibraryDashboard onNavigateToCatalog={() => setCurrentTab('catalog')} />
        ) : (
          <BookCatalogPage />
        )}
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

  return isAuthenticated ? <MainLayout /> : <AuthPage />
}

export function App() {
  return (
    <AuthProvider>
      <Main />
    </AuthProvider>
  )
}

export default App
