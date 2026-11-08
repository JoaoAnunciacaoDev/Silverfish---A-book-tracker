import { useState, useEffect } from 'react'
import { getAdminDashboardStats, listAdminUsers, updateUserRole } from '@/api/admin'
import {
  adminListAllPatchNotes,
  adminCreatePatchNote,
  adminUpdatePatchNote,
  adminDeletePatchNote,
} from '@/api/patchNotes'
import type { AdminDashboardData, AdminUserView } from '@/types/admin'
import type { PatchNote } from '@/types/patchNotes'
import {
  ShieldCheck,
  Users,
  BookOpen,
  ScrollText,
  Sparkles,
  Search,
  Plus,
  Trash2,
  Rocket,
  Zap,
  Wrench,
  Globe,
  Flame,
} from 'lucide-react'

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'patchNotes'>('overview')

  // Overview State
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null)
  const [isStatsLoading, setIsStatsLoading] = useState(false)

  // Users Management State
  const [users, setUsers] = useState<AdminUserView[]>([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [isUsersLoading, setIsUsersLoading] = useState(false)

  // Patch Notes Management State
  const [patchNotes, setPatchNotes] = useState<PatchNote[]>([])
  const [isPatchNotesLoading, setIsPatchNotesLoading] = useState(false)

  // New Patch Note Form
  const [version, setVersion] = useState('')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [features, setFeatures] = useState<string[]>([''])
  const [improvements, setImprovements] = useState<string[]>([''])
  const [fixes, setFixes] = useState<string[]>([''])
  const [isPublished, setIsPublished] = useState(false)
  const [isSubmittingNote, setIsSubmittingNote] = useState(false)
  const [noteFeedback, setNoteFeedback] = useState<string | null>(null)

  // Carrega Visão Geral
  const loadOverview = async () => {
    setIsStatsLoading(true)
    try {
      const data = await getAdminDashboardStats()
      setDashboardData(data)
    } catch (err) {
      console.error('Erro ao buscar estatísticas do admin:', err)
    } finally {
      setIsStatsLoading(false)
    }
  }

  // Carrega Usuários
  const loadUsers = async () => {
    setIsUsersLoading(true)
    try {
      const data = await listAdminUsers(1, 50, userSearchQuery, roleFilter)
      setUsers(data.users || [])
      setUsersTotal(data.total || 0)
    } catch (err) {
      console.error('Erro ao listar usuários:', err)
    } finally {
      setIsUsersLoading(false)
    }
  }

  // Carrega Patch Notes
  const loadPatchNotes = async () => {
    setIsPatchNotesLoading(true)
    try {
      const data = await adminListAllPatchNotes()
      setPatchNotes(data.patch_notes || [])
    } catch (err) {
      console.error('Erro ao listar patch notes admin:', err)
    } finally {
      setIsPatchNotesLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'overview') loadOverview()
    if (activeTab === 'users') loadUsers()
    if (activeTab === 'patchNotes') loadPatchNotes()
  }, [activeTab, roleFilter])

  const handleToggleRole = async (userId: string, currentRole: 'USER' | 'SUPERUSER') => {
    const nextRole = currentRole === 'SUPERUSER' ? 'USER' : 'SUPERUSER'
    if (!confirm(`Deseja alterar o papel deste usuário para ${nextRole}?`)) return

    try {
      await updateUserRole(userId, nextRole)
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: nextRole } : u))
      )
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar papel do usuário')
    }
  }

  const handleCreatePatchNote = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingNote(true)
    setNoteFeedback(null)

    try {
      await adminCreatePatchNote({
        version: version.trim(),
        title: title.trim(),
        summary: summary.trim(),
        is_published: isPublished,
        changes: {
          features: features.filter((f) => f.trim().length > 0),
          improvements: improvements.filter((imp) => imp.trim().length > 0),
          fixes: fixes.filter((fx) => fx.trim().length > 0),
        },
      })

      setNoteFeedback('Nota de atualização registrada com sucesso!')
      setVersion('')
      setTitle('')
      setSummary('')
      setFeatures([''])
      setImprovements([''])
      setFixes([''])
      setIsPublished(false)
      loadPatchNotes()
    } catch (err: any) {
      setNoteFeedback(err.message || 'Erro ao criar nota de atualização')
    } finally {
      setIsSubmittingNote(false)
    }
  }

  const handleTogglePublish = async (note: PatchNote) => {
    try {
      await adminUpdatePatchNote(note.id, {
        is_published: !note.is_published,
      })
      loadPatchNotes()
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar publicação')
    }
  }

  const handleDeleteNote = async (id: string) => {
    if (!confirm('Tem certeza de que deseja excluir esta nota de versão?')) return

    try {
      await adminDeletePatchNote(id)
      setPatchNotes((prev) => prev.filter((n) => n.id !== id))
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir nota')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header do Painel Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-3xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Painel de Administração</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              SUPERUSER
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Acompanhe o crescimento da plataforma, gerencie contas e publique notas de versão.
          </p>
        </div>

        {/* Abas */}
        <div className="flex items-center bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Métricas</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Usuários</span>
          </button>

          <button
            onClick={() => setActiveTab('patchNotes')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'patchNotes'
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Patch Notes</span>
          </button>
        </div>
      </div>

      {/* ABA 1: MÉTRICAS GLOBAIS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {isStatsLoading || !dashboardData ? (
            <div className="py-16 text-center text-slate-400 text-xs animate-pulse">
              Carregando métricas globais da plataforma...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-2xl">
                  <span className="text-[11px] text-slate-400 font-medium block mb-1">Total de Leitores</span>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-extrabold text-white">
                      {dashboardData.overview.total_users}
                    </span>
                    <Users className="w-5 h-5 text-indigo-400" />
                  </div>
                  <span className="text-[10px] text-emerald-400 mt-1 block">
                    +{dashboardData.overview.new_users_last_30_days} novos nos últimos 30d
                  </span>
                </div>

                <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-2xl">
                  <span className="text-[11px] text-slate-400 font-medium block mb-1">Ativos no Mês</span>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-extrabold text-teal-400">
                      {dashboardData.overview.active_users_this_month}
                    </span>
                    <Flame className="w-5 h-5 text-teal-400" />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">com leituras registradas</span>
                </div>

                <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-2xl">
                  <span className="text-[11px] text-slate-400 font-medium block mb-1">Páginas Lidas Globais</span>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-extrabold text-emerald-400">
                      {dashboardData.overview.total_pages_read.toLocaleString('pt-BR')}
                    </span>
                    <ScrollText className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    em {dashboardData.overview.total_sessions} sessões
                  </span>
                </div>

                <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-2xl">
                  <span className="text-[11px] text-slate-400 font-medium block mb-1">Livros Cadastrados</span>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-extrabold text-sky-400">
                      {dashboardData.overview.total_books}
                    </span>
                    <BookOpen className="w-5 h-5 text-sky-400" />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {dashboardData.overview.total_reviews} avaliações
                  </span>
                </div>
              </div>

              {/* Leitores com Maior Ofensiva */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 shadow">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
                  Leitores com Maiores Ofensivas Atuais
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {dashboardData.top_streakers.map((s, idx) => (
                    <div
                      key={s.id}
                      className="p-3 bg-slate-800/40 border border-slate-800 rounded-2xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-mono font-bold text-slate-500">#{idx + 1}</span>
                        <div>
                          <span className="text-xs font-bold text-white block">{s.display_name}</span>
                          <span className="text-[11px] text-slate-400">@{s.username}</span>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 fill-amber-400" />
                        {s.streak} dias
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ABA 2: GESTÃO DE USUÁRIOS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Barra de Filtro */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                placeholder="Filtrar por nome, username ou e-mail..."
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Todos os Papéis</option>
              <option value="USER">Apenas Usuários</option>
              <option value="SUPERUSER">Apenas Administradores</option>
            </select>

            <button
              onClick={loadUsers}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Buscar
            </button>
          </div>

          {/* Tabela de Usuários */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl overflow-hidden shadow">
            <div className="p-3.5 border-b border-slate-800 text-xs font-semibold text-slate-400 flex justify-between">
              <span>{usersTotal} usuários cadastrados</span>
            </div>

            {isUsersLoading ? (
              <div className="py-16 text-center text-slate-400 text-xs animate-pulse">
                Carregando usuários...
              </div>
            ) : users.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Nenhum usuário encontrado.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/40">
                      <th className="py-3 px-4">Leitor</th>
                      <th className="py-3 px-4">E-mail</th>
                      <th className="py-3 px-4">Páginas Lidas</th>
                      <th className="py-3 px-4">Livros</th>
                      <th className="py-3 px-4">Papel</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-xs">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{u.display_name}</div>
                          <div className="text-[11px] text-slate-400">@{u.username}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">{u.email}</td>
                        <td className="py-3 px-4 text-emerald-400 font-bold">{u.total_pages_read}</td>
                        <td className="py-3 px-4 text-slate-300">{u.total_books_read}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === 'SUPERUSER'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleToggleRole(u.id, u.role)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                          >
                            {u.role === 'SUPERUSER' ? 'Tornar Usuário' : 'Promover a Admin'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 3: PATCH NOTES (PUBLICADOR) */}
      {activeTab === 'patchNotes' && (
        <div className="space-y-6">
          {/* Formulário de Nova Versão */}
          <form
            onSubmit={handleCreatePatchNote}
            className="p-6 bg-slate-900/70 border border-slate-800 rounded-3xl space-y-4 shadow"
          >
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Publicar Nova Versão (Patch Note)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Número da Versão</label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="ex: v1.4.0"
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Título da Atualização</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ex: Fase 4 — Notificações Push e Painel Admin"
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Resumo da Versão</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Breve descrição das principais mudanças desta versão..."
                rows={2}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            {/* Listas Dinâmicas de Mudanças */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Novidades */}
              <div className="p-3 bg-slate-800/30 border border-slate-800 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <Rocket className="w-3.5 h-3.5" /> Novidades
                </span>
                {features.map((item, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const copy = [...features]
                      copy[idx] = e.target.value
                      setFeatures(copy)
                    }}
                    placeholder={`Item ${idx + 1}`}
                    className="w-full px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setFeatures([...features, ''])}
                  className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Adicionar
                </button>
              </div>

              {/* Melhorias */}
              <div className="p-3 bg-slate-800/30 border border-slate-800 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-sky-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" /> Melhorias
                </span>
                {improvements.map((item, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const copy = [...improvements]
                      copy[idx] = e.target.value
                      setImprovements(copy)
                    }}
                    placeholder={`Item ${idx + 1}`}
                    className="w-full px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setImprovements([...improvements, ''])}
                  className="text-[11px] text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Adicionar
                </button>
              </div>

              {/* Correções */}
              <div className="p-3 bg-slate-800/30 border border-slate-800 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                  <Wrench className="w-3.5 h-3.5" /> Correções
                </span>
                {fixes.map((item, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const copy = [...fixes]
                      copy[idx] = e.target.value
                      setFixes(copy)
                    }}
                    placeholder={`Item ${idx + 1}`}
                    className="w-full px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none"
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setFixes([...fixes, ''])}
                  className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Adicionar
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-500 focus:ring-indigo-500"
                />
                <span>Publicar imediatamente (anunciar no feed)</span>
              </label>

              <button
                type="submit"
                disabled={isSubmittingNote}
                className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
              >
                {isSubmittingNote ? 'Salvando...' : 'Salvar Versão'}
              </button>
            </div>

            {noteFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold text-center ${
                  noteFeedback.includes('sucesso')
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {noteFeedback}
              </div>
            )}
          </form>

          {/* Lista de Versões Cadastradas */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Versões no Banco de Dados
            </h4>

            {isPatchNotesLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs animate-pulse">
                Carregando versões...
              </div>
            ) : patchNotes.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                Nenhuma nota de versão cadastrada.
              </div>
            ) : (
              patchNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-emerald-400 bg-slate-800 px-2 py-0.5 rounded-lg">
                        {note.version}
                      </span>
                      <h5 className="text-xs font-bold text-white">{note.title}</h5>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          note.is_published
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {note.is_published ? 'Publicado' : 'Rascunho'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1">{note.summary}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTogglePublish(note)}
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer"
                    >
                      {note.is_published ? 'Despublicar' : 'Publicar'}
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
