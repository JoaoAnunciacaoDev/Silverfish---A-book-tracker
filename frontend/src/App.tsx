import { useState } from 'react'
import { AuthProvider, useAuth } from '@/features/auth/AuthContext'
import { AuthPage } from '@/features/auth/AuthPage'
import { BookCatalogPage } from '@/features/books/BookCatalogPage'
import { LibraryPage } from '@/features/library/LibraryPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { JournalPage } from '@/features/journal/JournalPage'
import { SocialPage } from '@/features/social/SocialPage'
import { AdminPage } from '@/features/admin/AdminPage'
import { PrivacySettingsModal } from '@/features/social/PrivacySettingsModal'
import { PatchNotesModal } from '@/features/patchNotes/PatchNotesModal'
import { NotificationSettingsModal } from '@/features/notifications/NotificationSettingsModal'
import { Footer } from '@/components/layout/Footer'
import {
  BookOpen,
  Compass,
  Library,
  LineChart,
  LogOut,
  ScrollText,
  Users,
  Settings,
  ShieldCheck,
  Bell,
  Sparkles,
} from 'lucide-react'

function MainLayout() {
  const { user, logout } = useAuth()
  const [currentTab, setCurrentTab] = useState<'library' | 'journal' | 'dashboard' | 'catalog' | 'social' | 'admin'>('library')
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false)
  const [isPatchNotesOpen, setIsPatchNotesOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  const isSuperUser = user?.role === 'SUPERUSER'

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

            {/* Navegação desktop */}
            <nav className="hidden md:flex items-center space-x-1">
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
                onClick={() => setCurrentTab('journal')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  currentTab === 'journal'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <ScrollText className="w-4 h-4" />
                <span>Diário</span>
              </button>

              <button
                onClick={() => setCurrentTab('dashboard')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  currentTab === 'dashboard'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <LineChart className="w-4 h-4" />
                <span>Painel & Metas</span>
              </button>

              <button
                onClick={() => setCurrentTab('social')}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  currentTab === 'social'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Comunidade</span>
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
                <span>Buscar Livros</span>
              </button>

              {/* Botão de Painel Admin exclusivo para SUPERUSER */}
              {isSuperUser && (
                <button
                  onClick={() => setCurrentTab('admin')}
                  className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    currentTab === 'admin'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-indigo-400 hover:text-indigo-200 hover:bg-indigo-500/10'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin</span>
                </button>
              )}
            </nav>
          </div>

          {/* Atalhos Rápidos & Perfil */}
          <div className="flex items-center space-x-2">
            {/* Notas de Atualização / Novidades */}
            <button
              onClick={() => setIsPatchNotesOpen(true)}
              className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition cursor-pointer"
              title="Novidades da Plataforma (Patch Notes)"
            >
              <Sparkles className="w-4 h-4" />
            </button>

            {/* Lembretes e Notificações */}
            <button
              onClick={() => setIsNotificationsOpen(true)}
              className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition cursor-pointer"
              title="Configurar Lembretes de Leitura"
            >
              <Bell className="w-4 h-4" />
            </button>

            {/* Perfil & Privacidade */}
            <button
              onClick={() => setIsPrivacyModalOpen(true)}
              className="flex items-center space-x-2 bg-slate-800/60 hover:bg-slate-800 pl-2 pr-3 py-1.5 rounded-full border border-slate-700/50 text-xs transition cursor-pointer"
              title="Configurações de Perfil e Privacidade"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[11px]">
                {user?.display_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="font-medium text-slate-200 hidden xs:inline">{user?.display_name}</span>
              <Settings className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Logout */}
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

      {/* Conteúdo Principal com padding inferior para a barra mobile */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 pb-24 md:pb-8">
        {currentTab === 'library' ? (
          <LibraryPage onNavigateToCatalog={() => setCurrentTab('catalog')} />
        ) : currentTab === 'journal' ? (
          <JournalPage />
        ) : currentTab === 'dashboard' ? (
          <DashboardPage />
        ) : currentTab === 'social' ? (
          <SocialPage />
        ) : currentTab === 'admin' ? (
          <AdminPage />
        ) : (
          <BookCatalogPage />
        )}
      </main>

      {/* Rodapé com créditos */}
      <div className="pb-16 md:pb-0">
        <Footer />
      </div>

      {/* Barra de Navegação Inferior para Mobile (estilo App / PWA) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 py-2 px-1 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => setCurrentTab('library')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition cursor-pointer ${
            currentTab === 'library'
              ? 'text-emerald-400 bg-emerald-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Library className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-semibold">Estante</span>
        </button>

        <button
          onClick={() => setCurrentTab('journal')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition cursor-pointer ${
            currentTab === 'journal'
              ? 'text-emerald-400 bg-emerald-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ScrollText className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-semibold">Diário</span>
        </button>

        <button
          onClick={() => setCurrentTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition cursor-pointer ${
            currentTab === 'dashboard'
              ? 'text-emerald-400 bg-emerald-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LineChart className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-semibold">Painel</span>
        </button>

        <button
          onClick={() => setCurrentTab('social')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition cursor-pointer ${
            currentTab === 'social'
              ? 'text-emerald-400 bg-emerald-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-semibold">Social</span>
        </button>

        {isSuperUser ? (
          <button
            onClick={() => setCurrentTab('admin')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition cursor-pointer ${
              currentTab === 'admin'
                ? 'text-indigo-400 bg-indigo-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-semibold">Admin</span>
          </button>
        ) : (
          <button
            onClick={() => setCurrentTab('catalog')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition cursor-pointer ${
              currentTab === 'catalog'
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-semibold">Explorar</span>
          </button>
        )}
      </nav>

      {/* Modais da Aplicação */}
      {isPrivacyModalOpen && (
        <PrivacySettingsModal onClose={() => setIsPrivacyModalOpen(false)} />
      )}

      {isPatchNotesOpen && (
        <PatchNotesModal onClose={() => setIsPatchNotesOpen(false)} />
      )}

      {isNotificationsOpen && (
        <NotificationSettingsModal onClose={() => setIsNotificationsOpen(false)} />
      )}
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
