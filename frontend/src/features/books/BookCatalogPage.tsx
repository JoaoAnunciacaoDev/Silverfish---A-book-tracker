import { useState } from 'react'
import {
  searchExternalBooks,
  importBook,
} from '@/api/books'
import type { Book, ExternalBookItem, PaginationMeta } from '@/types/book'
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
  const [searchProvider, setSearchProvider] = useState<string | null>(null)
  const [fallbackUsed, setFallbackUsed] = useState(false)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4000)
  }

  // Executa busca global paginada
  const executeSearch = async (query: string, page = 1) => {
    const trimmed = query.trim()
    if (!trimmed) {
      setActiveQuery('')
      setSearchResults([])
      setSearchProvider(null)
      setFallbackUsed(false)
      return
    }

    try {
      setIsSearching(true)
      setSearchError(null)
      setActiveQuery(trimmed)

      const res = await searchExternalBooks(trimmed, page, 15)
      setSearchResults(res.results)
      setSearchPagination(res.pagination)
      setSearchProvider(res.provider || null)
      setFallbackUsed(Boolean(res.fallback_used))
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
    setSearchProvider(null)
    setFallbackUsed(false)
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

      // Abre o modal para escolher a prateleira / status na estante pessoal
      setBookToAddToLibrary(res.book)
      showToast(`"${res.book.title}" adicionado! Escolha a categoria na sua estante.`)
    } catch (err: unknown) {
      if (err instanceof Error) {
        showToast(err.message)
      } else {
        showToast('Falha ao adicionar livro')
      }
    } finally {
      setImportingKey(null)
    }
  }

  const handleBookCreated = (newBook: Book) => {
    showToast(`"${newBook.title}" cadastrado e adicionado à sua estante!`)
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
            Buscar & Descobrir Livros
          </h1>
          <p className="text-slate-400 text-sm">
            Encontre obras na internet ou cadastre manualmente para adicionar à sua estante.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition cursor-pointer shadow-sm hover:shadow-emerald-950/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo Livro</span>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-300">
              Resultados para <span className="text-emerald-400 font-bold">"{activeQuery}"</span>
              {searchPagination.total_items > 0 && (
                <span className="text-slate-500 font-normal ml-2">
                  ({searchPagination.total_items} encontrados)
                </span>
              )}
            </h2>

            {fallbackUsed && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-full w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                {searchProvider === 'open_library'
                  ? 'Catálogo Open Library ativo'
                  : 'Acervo complementar Open Library'}
              </span>
            )}
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

              {/* Dica amigável sobre títulos e gibis/mangás */}
              <div className="max-w-lg mx-auto bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 text-left flex items-start space-x-3">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p>
                    <strong className="text-slate-200">Dica de busca:</strong> As bases de dados mundiais indexam principalmente livros comerciais com ISBN de livraria.
                  </p>
                  <p>
                    Revistas em quadrinhos mensais de banca (como gibis da Panini/Turma da Mônica Jovem) e edições raras ou independentes costumam não ter registro ISBN individual.
                  </p>
                  <p>
                    Você pode cadastrar essa edição específica diretamente abaixo para adicioná-la à sua estante:
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
        /* Estado Padrão (Sem Busca Ativa): Tela limpa de boas-vindas à pesquisa */
        <div className="py-12 sm:py-16 text-center border border-dashed border-slate-800 rounded-3xl p-6 sm:p-10 space-y-5 bg-slate-900/30">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
            <Search className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white">Pesquise Qualquer Livro</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Digite o título, autor ou ISBN acima para pesquisar milhões de obras e adicioná-las diretamente à sua estante.
            </p>
          </div>

          {/* Sugestões rápidas de pesquisa */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 max-w-lg mx-auto">
            <span className="text-xs text-slate-500 font-medium">Sugestões rápidas:</span>
            {['Machado de Assis', 'O Hobbit', 'Ficção Científica', 'George Orwell', 'Clarice Lispector'].map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => {
                  setSearchQuery(term)
                  executeSearch(term, 1)
                }}
                className="px-3 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs rounded-full border border-slate-700/50 transition cursor-pointer"
              >
                {term}
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-center gap-3">
            <span className="text-xs text-slate-400">Não encontrou a edição ou livro desejado?</span>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-semibold border border-emerald-500/30 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Cadastrar Manualmente</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal de Cadastro Manual */}
      <CreateBookModal
        isOpen={isModalOpen}
        initialTitle={activeQuery}
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
