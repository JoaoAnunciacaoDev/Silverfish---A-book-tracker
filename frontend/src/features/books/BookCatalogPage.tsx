import { useEffect, useState, useCallback } from 'react'
import {
  listBooks,
  searchExternalBooks,
  importBook,
} from '@/api/books'
import type { Book, ExternalBookItem, PaginationMeta } from '@/types/book'
import { BookCard } from './BookCard'
import { ExternalBookCard } from './ExternalBookCard'
import { CreateBookModal } from './CreateBookModal'
import { AddToLibraryModal } from '@/features/library/AddToLibraryModal'
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Compass,
  Info,
  Loader2,
  Plus,
  Search,
} from 'lucide-react'

export function BookCatalogPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [bookToAddToLibrary, setBookToAddToLibrary] = useState<Book | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Estado dos livros locais (quando não há busca ativa)
  const [localBooks, setLocalBooks] = useState<Book[]>([])
  const [localPagination, setLocalPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 15,
    total_items: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false,
  })
  const [isLocalLoading, setIsLocalLoading] = useState(false)

  // Estado dos resultados da busca global
  const [searchResults, setSearchResults] = useState<ExternalBookItem[]>([])
  const [searchPagination, setSearchPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 15,
    total_items: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false,
  })
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [importingKey, setImportingKey] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4000)
  }

  // Carrega livros locais salvos no sistema
  const fetchLocalBooks = useCallback(async (page: number) => {
    try {
      setIsLocalLoading(true)
      const res = await listBooks({ page, limit: 15 })
      setLocalBooks(res.books)
      setLocalPagination(res.pagination)
    } catch {
      // Ignora erro inicial
    } finally {
      setIsLocalLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!activeQuery) {
      fetchLocalBooks(localPagination.page)
    }
  }, [activeQuery, localPagination.page, fetchLocalBooks])

  // Executa busca global paginada
  const executeSearch = async (query: string, page = 1) => {
    const trimmed = query.trim()
    if (!trimmed) {
      setActiveQuery('')
      setSearchResults([])
      return
    }

    try {
      setIsSearching(true)
      setSearchError(null)
      setActiveQuery(trimmed)

      const res = await searchExternalBooks(trimmed, page, 15)
      setSearchResults(res.results)
      setSearchPagination(res.pagination)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setSearchError(err.message)
      } else {
        setSearchError('Ocorreu um erro ao pesquisar os livros')
      }
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    executeSearch(searchQuery, 1)
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setActiveQuery('')
    setSearchResults([])
  }

  // Importa / salva livro
  const handleImport = async (item: ExternalBookItem) => {
    try {
      setImportingKey(item.open_library_key)
      const res = await importBook({
        open_library_key: item.open_library_key,
        title: item.title,
        author: item.author,
        cover_url: item.cover_url,
        page_count: item.page_count,
        isbn: item.isbn,
      })

      // Atualiza o item na lista de resultados para "in_catalog: true"
      setSearchResults((prev) =>
        prev.map((doc) =>
          doc.open_library_key === item.open_library_key
            ? { ...doc, in_catalog: true, local_book_id: res.book.id }
            : doc
        )
      )

      showToast(`"${res.book.title}" salvo no seu acervo!`)
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message)
      } else {
        alert('Falha ao salvar livro')
      }
    } finally {
      setImportingKey(null)
    }
  }

  const handleBookCreated = (newBook: Book) => {
    showToast(`"${newBook.title}" cadastrado com sucesso!`)
    fetchLocalBooks(1)
    if (activeQuery) {
      handleClearSearch()
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-4">
          <BookOpen className="w-5 h-5" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Compass className="w-6 h-6 text-emerald-400" />
            Explorar Livros
          </h1>
          <p className="text-slate-400 text-sm">
            Encontre obras por título ou autor para adicionar às suas leituras.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition cursor-pointer shadow-sm hover:shadow-emerald-950/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Livro</span>
        </button>
      </div>

      {/* Barra de Pesquisa Unificada */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Digite o título do livro, autor ou ISBN e aperte Enter..."
          className="w-full pl-12 pr-28 py-3.5 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-hidden transition shadow-inner"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1.5">
          {activeQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="px-2.5 py-1 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              Limpar
            </button>
          )}
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white disabled:text-slate-500 text-xs font-semibold rounded-xl transition cursor-pointer disabled:cursor-not-allowed"
          >
            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Buscar'}
          </button>
        </div>
      </form>

      {/* Resultados de Busca Global Ativa */}
      {activeQuery ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">
              Resultados para <span className="text-emerald-400 font-bold">"{activeQuery}"</span>
              {searchPagination.total_items > 0 && (
                <span className="text-slate-500 font-normal ml-2">
                  ({searchPagination.total_items} encontrados)
                </span>
              )}
            </h2>

            <button
              onClick={handleClearSearch}
              className="text-xs text-emerald-400 hover:underline cursor-pointer"
            >
              Voltar ao acervo
            </button>
          </div>

          {searchError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl text-sm">
              {searchError}
            </div>
          )}

          {isSearching ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-sm">Buscando livros...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-slate-800 rounded-3xl p-8 space-y-4">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white">Nenhum resultado encontrado</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  Não localizamos nenhuma obra correspondente a "{activeQuery}".
                </p>
              </div>

              {/* Dica amigável sobre títulos internacionais / traduzidos */}
              <div className="max-w-lg mx-auto bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 text-left flex items-start space-x-3">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p>
                    <strong className="text-slate-200">Dica de busca:</strong> O catálogo mundial indexa principalmente títulos originais (por exemplo, <em>"Reality Is Broken"</em> para a obra de Jane McGonigal).
                  </p>
                  <p>
                    Se o seu livro for uma edição brasileira ou independente, você pode cadastrá-lo diretamente:
                  </p>
                </div>
              </div>

              <div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar "{activeQuery}" Manualmente</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((item) => (
                <ExternalBookCard
                  key={item.open_library_key}
                  item={item}
                  onImport={handleImport}
                  isImporting={importingKey === item.open_library_key}
                />
              ))}
            </div>
          )}

          {/* Paginação dos Resultados da Busca */}
          {searchPagination.total_pages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <p className="text-xs text-slate-400">
                Página <span className="font-semibold text-white">{searchPagination.page}</span> de{' '}
                <span className="font-semibold text-white">{searchPagination.total_pages}</span>
              </p>

              <div className="flex items-center space-x-2">
                <button
                  disabled={!searchPagination.has_prev || isSearching}
                  onClick={() => executeSearch(activeQuery, searchPagination.page - 1)}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>

                <button
                  disabled={!searchPagination.has_next || isSearching}
                  onClick={() => executeSearch(activeQuery, searchPagination.page + 1)}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <span>Próxima</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Estado Padrão (Sem Busca Ativa): Mostra os livros do acervo */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">
              Livros no Acervo do Silverfish ({localPagination.total_items})
            </h2>
          </div>

          {isLocalLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-sm">Carregando acervo...</p>
            </div>
          ) : localBooks.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-slate-800 rounded-3xl p-8 space-y-3">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-semibold text-white">Nenhum livro no acervo ainda</h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto">
                Utilize a barra de pesquisa acima para encontrar livros ou cadastre uma nova obra.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {localBooks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onAddToLibrary={(b) => setBookToAddToLibrary(b)}
                />
              ))}
            </div>
          )}

          {/* Paginação do Acervo */}
          {localPagination.total_pages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <p className="text-xs text-slate-400">
                Página <span className="font-semibold text-white">{localPagination.page}</span> de{' '}
                <span className="font-semibold text-white">{localPagination.total_pages}</span>
              </p>

              <div className="flex items-center space-x-2">
                <button
                  disabled={!localPagination.has_prev || isLocalLoading}
                  onClick={() =>
                    setLocalPagination((prev) => ({
                      ...prev,
                      page: Math.max(1, prev.page - 1),
                    }))
                  }
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>

                <button
                  disabled={!localPagination.has_next || isLocalLoading}
                  onClick={() =>
                    setLocalPagination((prev) => ({
                      ...prev,
                      page: prev.page + 1,
                    }))
                  }
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <span>Próxima</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Cadastro Manual */}
      <CreateBookModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleBookCreated}
      />

      {/* Modal de Adicionar à Estante */}
      <AddToLibraryModal
        book={bookToAddToLibrary}
        isOpen={Boolean(bookToAddToLibrary)}
        onClose={() => setBookToAddToLibrary(null)}
        onSuccess={(item) => showToast(`"${item.book.title}" adicionado à sua estante!`)}
      />
    </div>
  )
}
