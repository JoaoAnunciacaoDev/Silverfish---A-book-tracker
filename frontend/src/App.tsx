import { useState } from 'react'
import { AuthProvider, useAuth } from '@/features/auth/AuthContext'
import { AuthPage } from '@/features/auth/AuthPage'
import { BookCatalogPage } from '@/features/books/BookCatalogPage'
import { LibraryPage } from '@/features/library/LibraryPage'
import {
  BookOpen,
  Compass,
  Library,
  LogOut,
} from 'lucide-react'

function MainLayout() {
  const { user, logout } = useAuth()
  const [currentTab, setCurrentTab] = useState<'library' | 'catalog'>('library')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header limpo e profissional */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-6">
            <div
              className="flex items-center space-x-3 cursor-pointer"
              onClick={() => setCurrentTab('library')}
            >
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
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
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
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
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

          {/* Perfil & Logout */}
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
          <LibraryPage onNavigateToCatalog={() => setCurrentTab('catalog')} />
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
