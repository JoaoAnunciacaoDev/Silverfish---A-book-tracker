export type AppTab = 'library' | 'journal' | 'dashboard' | 'catalog' | 'social' | 'admin'

export const VALID_TABS: readonly AppTab[] = [
  'library',
  'journal',
  'dashboard',
  'catalog',
  'social',
  'admin',
] as const

export type AppRoute =
  | { kind: 'tab'; tab: AppTab }
  | { kind: 'not_found'; path: string }

function isValidTab(value: string): value is AppTab {
  return (VALID_TABS as readonly string[]).includes(value)
}

/**
 * Resolve o pathname e a query string atuais para uma aba válida da aplicação ou rota 404.
 */
export function resolveAppRoute(pathname: string, search: string): AppRoute {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname || '/'

  if (normalizedPath === '/' || normalizedPath === '/index.html') {
    const tabParam = new URLSearchParams(search).get('tab')?.trim()
    if (!tabParam) {
      return { kind: 'tab', tab: 'library' }
    }
    if (isValidTab(tabParam)) {
      return { kind: 'tab', tab: tabParam }
    }
    return { kind: 'not_found', path: `${normalizedPath}${search}` }
  }

  const candidateTab = normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath
  if (isValidTab(candidateTab)) {
    return { kind: 'tab', tab: candidateTab }
  }

  return { kind: 'not_found', path: `${normalizedPath}${search}` }
}

/**
 * Constrói a URL canônica baseada em query string para preservar compatibilidade com PWA e SPA.
 */
export function buildTabUrl(tab: AppTab): string {
  return tab === 'library' ? '/' : `/?tab=${tab}`
}
