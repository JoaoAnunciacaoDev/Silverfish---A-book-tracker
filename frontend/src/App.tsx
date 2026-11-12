import { lazy, Suspense, useEffect, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider, useAuth } from '@/features/auth/AuthContext'
import { AuthPage } from '@/features/auth/AuthPage'
import { LibraryPage } from '@/features/library/LibraryPage'
import { Footer } from '@/components/layout/Footer'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { NotFoundPage } from '@/components/NotFoundPage'
import {
  buildTabUrl,
  resolveAppRoute,
  type AppRoute,
  type AppTab,
} from '@/utils/routing'
import {
  BookOpen,
  Compass,
  Library,
  LineChart,
  Loader2,
  LogOut,
  RefreshCw,
  ScrollText,
  Users,
  Settings,
  ShieldCheck,
  Bell,
  Sparkles,
  WifiOff,
} from 'lucide-react'

const BookCatalogPage = lazy(() =>
  import('@/features/books/BookCatalogPage').then((m) => ({ default: m.BookCatalogPage }))
)
const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage }))
)
const JournalPage = lazy(() =>
  import('@/features/journal/JournalPage').then((m) => ({ default: m.JournalPage }))
)
const SocialPage = lazy(() =>
  import('@/features/social/SocialPage').then((m) => ({ default: m.SocialPage }))
)
const AdminPage = lazy(() =>
  import('@/features/admin/AdminPage').then((m) => ({ default: m.AdminPage }))
)
const PrivacySettingsModal = lazy(() =>
  import('@/features/social/PrivacySettingsModal').then((m) => ({ default: m.PrivacySettingsModal }))
)
const PatchNotesModal = lazy(() =>
  import('@/features/patchNotes/PatchNotesModal').then((m) => ({ default: m.PatchNotesModal }))
)
const NotificationSettingsModal = lazy(() =>
  import('@/features/notifications/NotificationSettingsModal').then((m) => ({
    default: m.NotificationSettingsModal,
  }))
)

function TabLoadingFallback() {
  return (
    <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
      <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
      <p className="text-xs">Carregando seção...</p>
    </div>
  )
}

interface MainLayoutProps {
  route: AppRoute
  onSelectTab: (tab: AppTab) => void
}

function MainLayout({ route, onSelectTab }: MainLayoutProps) {
  const { user, logout, isReconnecting, connectionError, refreshUser } = useAuth()
  const currentTab = route.kind === 'tab' ? route.tab : null
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
              onClick={() => onSelectTab('library')}
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
                onClick={() => onSelectTab('library')}
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
                onClick={() => onSelectTab('journal')}
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
                onClick={() => onSelectTab('dashboard')}
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
                onClick={() => onSelectTab('social')}
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
                onClick={() => onSelectTab('catalog')}
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
                  onClick={() => onSelectTab('admin')}
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
        {connectionError && (
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200">
            <div className="flex items-center space-x-2">
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{connectionError}</span>
            </div>
            <button
              type="button"
              onClick={() => refreshUser()}
              disabled={isReconnecting}
              className="inline-flex items-center space-x-1.5 self-start sm:self-auto px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 font-semibold transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
              <span>{isReconnecting ? 'Reconectando...' : 'Reconectar'}</span>
            </button>
          </div>
        )}

        <ErrorBoundary fallbackTitle="Ocorreu um erro ao carregar esta página">
          <Suspense fallback={<TabLoadingFallback />}>
            {route.kind === 'not_found' ? (
              <NotFoundPage
                path={route.path}
                isAuthenticated
                onGoHome={() => onSelectTab('library')}
              />
            ) : currentTab === 'library' ? (
              <LibraryPage onNavigateToCatalog={() => onSelectTab('catalog')} />
            ) : currentTab === 'journal' ? (
              <JournalPage />
            ) : currentTab === 'dashboard' ? (
              <DashboardPage />
            ) : currentTab === 'social' ? (
              <SocialPage />
            ) : currentTab === 'admin' ? (
              isSuperUser ? <AdminPage /> : <LibraryPage onNavigateToCatalog={() => onSelectTab('catalog')} />
            ) : (
              <BookCatalogPage />
            )}
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Rodapé com créditos */}
      <div className="pb-16 md:pb-0">
        <Footer />
      </div>

      {/* Barra de Navegação Inferior para Mobile (estilo App / PWA) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 py-2 px-1 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => onSelectTab('library')}
          aria-label="Minha Estante de Livros"
          title="Minha Estante"
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 px-2 rounded-2xl transition cursor-pointer ${
            currentTab === 'library'
              ? 'text-emerald-400 bg-emerald-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Library className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-semibold">Estante</span>
        </button>

        <button
          onClick={() => onSelectTab('journal')}
          aria-label="Diário de Leitura"
          title="Diário"
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 px-2 rounded-2xl transition cursor-pointer ${
            currentTab === 'journal'
              ? 'text-emerald-400 bg-emerald-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ScrollText className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-semibold">Diário</span>
        </button>

        <button
          onClick={() => onSelectTab('dashboard')}
          aria-label="Painel de Estatísticas e Metas"
          title="Painel"
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 px-2 rounded-2xl transition cursor-pointer ${
            currentTab === 'dashboard'
              ? 'text-emerald-400 bg-emerald-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LineChart className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-semibold">Painel</span>
        </button>

        <button
          onClick={() => onSelectTab('social')}
          aria-label="Comunidade de Leitores"
          title="Social"
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 px-2 rounded-2xl transition cursor-pointer ${
            currentTab === 'social'
              ? 'text-emerald-400 bg-emerald-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-semibold">Social</span>
        </button>

        {/* Aba Buscar Livros (sempre visível para todos os usuários) */}
        <button
          onClick={() => onSelectTab('catalog')}
          aria-label="Buscar e Descobrir Livros"
          title="Buscar"
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 px-2 rounded-2xl transition cursor-pointer ${
            currentTab === 'catalog'
              ? 'text-emerald-400 bg-emerald-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-semibold">Buscar</span>
        </button>

        {/* Atalho Admin exclusivo para SUPERUSER (sem ocultar a busca) */}
        {isSuperUser && (
          <button
            onClick={() => onSelectTab('admin')}
            aria-label="Painel de Administração"
            title="Admin"
            className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 px-2 rounded-2xl transition cursor-pointer ${
              currentTab === 'admin'
                ? 'text-indigo-400 bg-indigo-500/10'
                : 'text-indigo-400/80 hover:text-indigo-200'
            }`}
          >
            <ShieldCheck className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-semibold">Admin</span>
          </button>
        )}
      </nav>

      {/* Modais da Aplicação */}
      <Suspense fallback={null}>
        {isPrivacyModalOpen && (
          <PrivacySettingsModal onClose={() => setIsPrivacyModalOpen(false)} />
        )}

        {isPatchNotesOpen && (
          <PatchNotesModal onClose={() => setIsPatchNotesOpen(false)} />
        )}

        {isNotificationsOpen && (
          <NotificationSettingsModal onClose={() => setIsNotificationsOpen(false)} />
        )}
      </Suspense>
    </div>
  )
}

function Main() {
  const { isAuthenticated, isLoading, connectionError, refreshUser, dismissConnectionError } = useAuth()
  const [route, setRoute] = useState<AppRoute>(() =>
    resolveAppRoute(window.location.pathname, window.location.search)
  )

  useEffect(() => {
    const syncFromLocation = () => {
      setRoute(resolveAppRoute(window.location.pathname, window.location.search))
    }

    window.addEventListener('popstate', syncFromLocation)

    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SILVERFISH_NAVIGATE' && typeof event.data.url === 'string') {
        const parsed = new URL(event.data.url, window.location.origin)
        window.history.pushState({}, '', parsed.pathname + parsed.search)
        setRoute(resolveAppRoute(parsed.pathname, parsed.search))
      }
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage)
      navigator.serviceWorker
        .getRegistration('/sw.js')
        .then((reg) => reg?.update().catch(() => {}))
        .catch(() => {})
    }

    return () => {
      window.removeEventListener('popstate', syncFromLocation)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage)
      }
    }
  }, [])

  const handleSelectTab = (tab: AppTab) => {
    const targetUrl = buildTabUrl(tab)
    if (window.location.pathname + window.location.search !== targetUrl) {
      window.history.pushState({}, '', targetUrl)
    }
    setRoute({ kind: 'tab', tab })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 select-none">
        <div className="flex flex-col items-center space-y-4 max-w-xs text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-950/20 animate-pulse">
            <BookOpen className="w-7 h-7 text-emerald-400" />
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-bold text-white tracking-wide">Silverfish</h1>
            <div className="flex items-center justify-center space-x-2 text-xs text-slate-400">
              <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span>Verificando sessão...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    if (route.kind === 'not_found') {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
          <div className="my-auto">
            <NotFoundPage
              path={route.path}
              isAuthenticated={false}
              onGoHome={() => handleSelectTab('library')}
            />
          </div>
          <Footer />
        </div>
      )
    }

    if (connectionError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-4">
          <div className="my-auto max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <WifiOff className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h1 className="text-lg font-bold text-white">Servidor demorou para responder</h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                O servidor pode estar saindo do modo de espera. Você pode tentar reconectar sua sessão sem precisar fazer login novamente.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                type="button"
                onClick={() => refreshUser()}
                className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Tentar novamente</span>
              </button>
              <button
                type="button"
                onClick={dismissConnectionError}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 transition cursor-pointer"
              >
                Ir para o login
              </button>
            </div>
          </div>
          <Footer />
        </div>
      )
    }

    return <AuthPage />
  }

  return <MainLayout route={route} onSelectTab={handleSelectTab} />
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Main />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
