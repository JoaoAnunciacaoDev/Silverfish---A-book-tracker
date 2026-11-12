import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getSocialFeed,
  getLeaderboard,
  searchUsers,
  followUser,
  unfollowUser,
  getPendingFollows,
  respondFollowRequest,
  toggleActivityLike,
  getActivityLikes,
  getActivityComments,
  createActivityComment,
} from '@/api/social'
import type {
  ActivityItem,
  ActivityComment,
  ActivityLiker,
  LeaderboardEntry,
  UserSearchResult,
} from '@/types/social'
import { useAuth } from '@/features/auth/AuthContext'
import { UserProfileModal } from './UserProfileModal'
import { triggerConfetti } from '@/components/ui/confetti'
import {
  Flame,
  Trophy,
  BookOpen,
  CheckCircle2,
  Target,
  ScrollText,
  Star,
  Award,
  Search,
  UserPlus,
  Users,
  Check,
  X,
  RefreshCw,
  Sparkles,
  Heart,
  Loader2,
  MessageSquare,
  Send,
  Calendar,
} from 'lucide-react'

const CURRENT_YEAR = new Date().getFullYear()
const RANKING_YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i)

export function SocialPage() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState<'feed' | 'rankings' | 'discover'>('feed')

  // Comments & Likes State
  const [expandedCommentsId, setExpandedCommentsId] = useState<string | null>(null)
  const [commentsMap, setCommentsMap] = useState<Record<string, ActivityComment[]>>({})
  const [isCommentsLoading, setIsCommentsLoading] = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [likesModalActivityId, setLikesModalActivityId] = useState<string | null>(null)
  const [activityLikers, setActivityLikers] = useState<ActivityLiker[]>([])
  const [isLikersLoading, setIsLikersLoading] = useState(false)

  // Rankings State
  const [rankingCriterion, setRankingCriterion] = useState<'pages' | 'books' | 'streak'>('pages')
  const [rankingYear, setRankingYear] = useState<number>(CURRENT_YEAR)

  // Discover / Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Profile Modal State
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null)
  const [socialToast, setSocialToast] = useState<string | null>(null)

  const showSocialToast = (msg: string) => {
    setSocialToast(msg)
    setTimeout(() => setSocialToast(null), 4000)
  }

  const feedQueryKey = ['social-feed', 1, 30] as const
  const feedQuery = useQuery({
    queryKey: feedQueryKey,
    queryFn: () => getSocialFeed(1, 30),
    enabled: activeTab === 'feed',
  })

  const rankingsQueryKey = ['social-rankings', rankingCriterion, rankingYear] as const
  const rankingsQuery = useQuery({
    queryKey: rankingsQueryKey,
    queryFn: () => getLeaderboard(rankingCriterion, rankingYear.toString()),
    enabled: activeTab === 'rankings',
  })

  const pendingQueryKey = ['pending-follows'] as const
  const pendingQuery = useQuery({
    queryKey: pendingQueryKey,
    queryFn: getPendingFollows,
    enabled: activeTab === 'discover',
  })

  const activities = feedQuery.data?.activities ?? []
  const isFeedLoading = feedQuery.isFetching
  const rankings: LeaderboardEntry[] = rankingsQuery.data?.leaderboard ?? []
  const isRankingsLoading = rankingsQuery.isFetching
  const pendingRequests = pendingQuery.data?.pending_requests ?? []

  const updateCachedActivities = (updater: (prev: ActivityItem[]) => ActivityItem[]) => {
    queryClient.setQueryData<{ activities: ActivityItem[]; page: number; limit: number; total: number }>(
      feedQueryKey,
      (prev) => (prev ? { ...prev, activities: updater(prev.activities || []) } : prev)
    )
  }

  const handleToggleLike = async (activityId: string) => {
    try {
      const res = await toggleActivityLike(activityId)
      if (res.liked) {
        triggerConfetti()
      }

      updateCachedActivities((prev) =>
        prev.map((act) => {
          if (act.id !== activityId) return act
          const existingLikedBy = act.liked_by ?? []
          let nextLikedBy = existingLikedBy

          if (currentUser) {
            const withoutCurrent = existingLikedBy.filter((u) => u.id !== currentUser.id)
            nextLikedBy = res.liked
              ? [
                  {
                    id: currentUser.id,
                    username: currentUser.username,
                    display_name: currentUser.display_name,
                    avatar_url: currentUser.avatar_url,
                  },
                  ...withoutCurrent,
                ].slice(0, 3)
              : withoutCurrent
          }

          return {
            ...act,
            has_liked: res.liked,
            likes_count: res.likes_count,
            liked_by: nextLikedBy,
          }
        })
      )
    } catch (err: any) {
      console.error('Erro ao curtir atividade:', err)
    }
  }

  const handleOpenLikesModal = async (item: ActivityItem) => {
    setLikesModalActivityId(item.id)
    setActivityLikers(item.liked_by ?? [])
    setIsLikersLoading(true)
    try {
      const res = await getActivityLikes(item.id)
      setActivityLikers(res.likes || [])
    } catch (err: any) {
      console.error('Erro ao carregar curtidas:', err)
    } finally {
      setIsLikersLoading(false)
    }
  }

  const handleToggleComments = async (activityId: string) => {
    if (expandedCommentsId === activityId) {
      setExpandedCommentsId(null)
      return
    }

    setExpandedCommentsId(activityId)
    setIsCommentsLoading(true)

    try {
      const res = await getActivityComments(activityId)
      setCommentsMap((prev) => ({ ...prev, [activityId]: res.comments || [] }))
    } catch (err) {
      console.error('Erro ao buscar comentários:', err)
    } finally {
      setIsCommentsLoading(false)
    }
  }

  const handleSubmitComment = async (activityId: string, e: React.FormEvent) => {
    e.preventDefault()
    if (!commentInput.trim() || isSubmittingComment) return

    setIsSubmittingComment(true)
    try {
      const res = await createActivityComment(activityId, commentInput.trim())
      setCommentsMap((prev) => ({
        ...prev,
        [activityId]: [...(prev[activityId] || []), res.comment],
      }))
      setCommentInput('')

      updateCachedActivities((prev) =>
        prev.map((act) =>
          act.id === activityId
            ? { ...act, comments_count: (act.comments_count || 0) + 1 }
            : act
        )
      )
    } catch (err: any) {
      showSocialToast(err.message || 'Erro ao enviar comentário')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const res = await searchUsers(searchQuery.trim())
      setSearchResults(res.users || [])
    } catch (err) {
      console.error('Erro ao buscar leitores:', err)
    } finally {
      setIsSearching(false)
    }
  }

  const handleToggleFollow = async (username: string, currentlyFollowing: boolean) => {
    try {
      if (currentlyFollowing) {
        await unfollowUser(username)
      } else {
        await followUser(username)
      }

      setSearchResults((prev) =>
        prev.map((u) => (u.username === username ? { ...u, is_following: !currentlyFollowing } : u))
      )
      showSocialToast(currentlyFollowing ? `Você deixou de seguir @${username}` : `Você agora segue @${username}`)
    } catch (err: any) {
      showSocialToast(err.message || 'Erro ao atualizar seguidor')
    }
  }

  const handleRespondRequest = async (followId: string, action: 'accept' | 'reject') => {
    try {
      await respondFollowRequest(followId, action)
      queryClient.setQueryData<{ pending_requests: Array<{ id: string; follower: any; created_at: string }>; total: number }>(
        pendingQueryKey,
        (prev) =>
          prev
            ? { ...prev, pending_requests: prev.pending_requests.filter((r) => r.id !== followId) }
            : prev
      )
      queryClient.invalidateQueries({ queryKey: ['social-feed'] })
      queryClient.invalidateQueries({ queryKey: ['social-rankings'] })
      showSocialToast(action === 'accept' ? 'Solicitação aceita!' : 'Solicitação rejeitada')
    } catch (err: any) {
      showSocialToast(err.message || 'Erro ao responder solicitação')
    }
  }

  const parseMetadata = (jsonStr?: string) => {
    if (!jsonStr) return {}
    try {
      return JSON.parse(jsonStr)
    } catch {
      return {}
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {socialToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-4">
          <Users className="w-5 h-5" />
          <span className="text-sm font-medium">{socialToast}</span>
        </div>
      )}

      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-3xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Comunidade de Leitores</h1>
          </div>
          <p className="text-xs text-slate-400">
            Acompanhe a evolução de leitura dos seus amigos, celebre conquistas e compita nos rankings mensais.
          </p>
        </div>

        {/* Abas de Navegação */}
        <div className="flex items-center bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('feed')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'feed'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Feed</span>
          </button>

          <button
            onClick={() => setActiveTab('rankings')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'rankings'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Rankings</span>
          </button>

          <button
            onClick={() => setActiveTab('discover')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 relative ${
              activeTab === 'discover'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Descobrir</span>
            {pendingRequests.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-1 right-1" />
            )}
          </button>
        </div>
      </div>

      {/* ABA 1: FEED DE ATIVIDADES COM CURTIDAS E COMENTÁRIOS */}
      {activeTab === 'feed' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Atividades Recentes
            </h2>
            <button
              onClick={() => feedQuery.refetch()}
              disabled={isFeedLoading}
              className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFeedLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>

          {isFeedLoading && activities.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs animate-pulse">
              Carregando feed da comunidade...
            </div>
          ) : activities.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 rounded-3xl border border-slate-800 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">Seu feed está silencioso</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Siga outros leitores na aba <strong>Descobrir</strong> ou registre suas próprias sessões de leitura para movimentar a comunidade!
              </p>
              <button
                onClick={() => setActiveTab('discover')}
                className="mt-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-semibold hover:bg-emerald-500/20 transition cursor-pointer"
              >
                Buscar Leitores
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((item) => {
                const meta = parseMetadata(item.metadata)
                const isCommentsOpen = expandedCommentsId === item.id
                const activityComments = commentsMap[item.id] || []

                return (
                  <div
                    key={item.id}
                    className="p-5 bg-slate-900/70 border border-slate-800 rounded-3xl hover:border-slate-700/80 transition flex flex-col gap-3.5 shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar do Leitor */}
                      <div
                        onClick={() => setSelectedUsername(item.user.username)}
                        className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white font-extrabold flex items-center justify-center text-sm shadow cursor-pointer shrink-0 hover:scale-105 transition"
                      >
                        {item.user.display_name?.charAt(0).toUpperCase() || 'U'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs mb-1">
                          <button
                            onClick={() => setSelectedUsername(item.user.username)}
                            className="font-bold text-white hover:text-emerald-400 transition cursor-pointer"
                          >
                            {item.user.display_name}
                          </button>
                          <span className="text-slate-500 text-[11px]">@{item.user.username}</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(item.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Conteúdo Contextual por Tipo de Atividade */}
                        {item.type === 'BOOK_FINISHED' && (
                          <div className="flex items-center gap-2 mt-1.5 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                            <div className="text-xs">
                              <span className="text-slate-300">Concluiu o livro </span>
                              <strong className="text-white font-semibold">
                                "{item.book?.title || meta.book_title || 'Livro'}"
                              </strong>
                              <span className="text-emerald-400 font-bold ml-1">🎉 Parabéns!</span>
                            </div>
                          </div>
                        )}

                        {item.type === 'BOOK_STARTED' && (
                          <div className="flex items-center gap-2 mt-1.5 p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-2xl">
                            <BookOpen className="w-5 h-5 text-sky-400 shrink-0" />
                            <div className="text-xs">
                              <span className="text-slate-300">Iniciou uma nova leitura: </span>
                              <strong className="text-white font-semibold">
                                "{item.book?.title || meta.book_title || 'Livro'}"
                              </strong>
                            </div>
                          </div>
                        )}

                        {item.type === 'GOAL_MET' && (
                          <div className="flex items-center gap-2 mt-1.5 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                            <Target className="w-5 h-5 text-amber-400 shrink-0" />
                            <div className="text-xs">
                              <span className="text-slate-300">Bateu a meta diária de leitura! </span>
                              <span className="text-amber-400 font-bold">
                                ({meta.pages_read || '20+'} páginas lidas hoje)
                              </span>
                            </div>
                          </div>
                        )}

                        {item.type === 'STREAK_MILESTONE' && (
                          <div className="flex items-center gap-2 mt-1.5 p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                            <Flame className="w-5 h-5 text-orange-400 fill-orange-400 shrink-0" />
                            <div className="text-xs">
                              <span className="text-slate-300">Alcançou a marca incrível de </span>
                              <strong className="text-orange-400 font-bold">{meta.streak} dias seguidos</strong>
                              <span className="text-slate-300"> de leitura! 🔥</span>
                            </div>
                          </div>
                        )}

                        {item.type === 'READING_SESSION' && (
                          <div className="flex items-center gap-2 mt-1.5 p-2.5 bg-slate-800/50 border border-slate-700/60 rounded-2xl">
                            <ScrollText className="w-5 h-5 text-purple-400 shrink-0" />
                            <div className="text-xs">
                              <span className="text-slate-300">Leu </span>
                              <strong className="text-white font-bold">{meta.pages_read} páginas</strong>
                              <span className="text-slate-300"> de </span>
                              <strong className="text-slate-200">
                                "{item.book?.title || meta.book_title || 'sua leitura'}"
                              </strong>
                              {meta.start_page !== undefined && meta.end_page !== undefined && (
                                <span className="text-slate-500 text-[11px] block mt-0.5">
                                  Páginas {meta.start_page} até {meta.end_page}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {item.type === 'REVIEW_POSTED' && (
                          <div className="mt-1.5 p-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
                            <div className="flex items-center gap-1.5 text-xs text-yellow-400 font-bold mb-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span>Avaliou com nota {meta.rating}/10</span>
                              <span className="text-slate-300 font-normal">"{meta.book_title}"</span>
                            </div>
                            {meta.comment && (
                              <p className="text-xs text-slate-300 italic line-clamp-2">"{meta.comment}"</p>
                            )}
                          </div>
                        )}

                        {item.type === 'ACHIEVEMENT_UNLOCKED' && (
                          <div className="flex items-center gap-2 mt-1.5 p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-2xl">
                            <Award className="w-5 h-5 text-teal-400 shrink-0" />
                            <div className="text-xs">
                              <span className="text-slate-300">Desbloqueou a conquista </span>
                              <strong className="text-teal-400 font-bold">"{meta.title || meta.code}"</strong>
                              {meta.tier && (
                                <span className="text-[10px] font-bold uppercase ml-1 px-1.5 py-0.2 bg-teal-500/20 text-teal-300 rounded">
                                  {meta.tier}
                                </span>
                              )}
                              {meta.description && (
                                <span className="text-slate-400 block text-[11px] mt-0.5">{meta.description}</span>
                              )}
                            </div>
                          </div>
                        )}

                        {item.type === 'PATCH_NOTE_PUBLISHED' && (
                          <div className="flex items-center gap-2.5 mt-1.5 p-3 bg-gradient-to-r from-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl">
                            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
                            <div className="text-xs">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-mono font-bold text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
                                  {meta.version}
                                </span>
                                <strong className="text-white font-bold">{meta.title}</strong>
                              </div>
                              <p className="text-slate-400">{meta.summary}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* BARRA DE INTERAÇÕES SOCIAIS: CURTIDAS & COMENTÁRIOS */}
                    <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleLike(item.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition cursor-pointer ${
                            item.has_liked
                              ? 'text-rose-400 bg-rose-500/10 font-bold'
                              : 'hover:text-rose-400 hover:bg-slate-800/60'
                          }`}
                        >
                          <Heart
                            className={`w-4 h-4 transition ${
                              item.has_liked ? 'fill-rose-400 scale-110' : ''
                            }`}
                          />
                          <span>{item.likes_count || 0}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleComments(item.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition cursor-pointer ${
                            isCommentsOpen
                              ? 'text-emerald-400 bg-emerald-500/10 font-bold'
                              : 'hover:text-emerald-400 hover:bg-slate-800/60'
                          }`}
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>{item.comments_count || 0}</span>
                        </button>
                      </div>

                      {(item.likes_count || 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => handleOpenLikesModal(item)}
                          className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white transition cursor-pointer py-1"
                          title="Ver quem curtiu esta postagem"
                        >
                          {item.liked_by && item.liked_by.length > 0 ? (
                            <>
                              <span className="flex -space-x-1.5">
                                {item.liked_by.slice(0, 3).map((liker) => (
                                  <span
                                    key={liker.id}
                                    className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-300 border border-slate-900 font-bold text-[10px] flex items-center justify-center"
                                  >
                                    {liker.display_name?.charAt(0).toUpperCase() || 'U'}
                                  </span>
                                ))}
                              </span>
                              <span>
                                Curtido por{' '}
                                <strong className="text-slate-200 font-semibold">
                                  {item.liked_by[0].display_name}
                                </strong>
                                {(item.likes_count || 0) > 1 &&
                                  ` e mais ${(item.likes_count || 0) - 1}`}
                              </span>
                            </>
                          ) : (
                            <span className="underline decoration-slate-600 underline-offset-2">
                              Ver quem curtiu ({item.likes_count})
                            </span>
                          )}
                        </button>
                      )}
                    </div>

                    {/* GAVETA DE COMENTÁRIOS EXPANSÍVEL */}
                    {isCommentsOpen && (
                      <div className="pt-3 border-t border-slate-800 space-y-3 animate-fade-in">
                        {isCommentsLoading ? (
                          <div className="text-center py-3 text-xs text-slate-500 animate-pulse">
                            Carregando comentários...
                          </div>
                        ) : activityComments.length === 0 ? (
                          <div className="text-center py-2 text-xs text-slate-500">
                            Seja o primeiro a deixar uma mensagem de incentivo!
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {activityComments.map((c) => (
                              <div
                                key={c.id}
                                className="flex items-start gap-2.5 p-2 bg-slate-800/40 rounded-xl text-xs"
                              >
                                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                                  {c.user?.display_name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-white">{c.user?.display_name}</span>
                                    <span className="text-[10px] text-slate-500">
                                      {new Date(c.created_at).toLocaleTimeString('pt-BR', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </div>
                                  <p className="text-slate-300 mt-0.5">{c.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Caixa de Entrada de Comentário */}
                        <form
                          onSubmit={(e) => handleSubmitComment(item.id, e)}
                          className="flex items-center gap-2 pt-1"
                        >
                          <input
                            type="text"
                            value={commentInput}
                            onChange={(e) => setCommentInput(e.target.value)}
                            placeholder="Escreva um comentário de incentivo..."
                            maxLength={500}
                            className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                          />
                          <button
                            type="submit"
                            disabled={!commentInput.trim() || isSubmittingComment}
                            className="p-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-xl transition cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA 2: RANKINGS SOCIAIS */}
      {activeTab === 'rankings' && (
        <div className="space-y-6">
          {/* Seletor de Critério e Ano */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-semibold text-slate-400">Classificação por:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRankingCriterion('pages')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    rankingCriterion === 'pages'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Mais Páginas no Ano
                </button>
                <button
                  onClick={() => setRankingCriterion('books')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    rankingCriterion === 'books'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Mais Livros no Ano
                </button>
                <button
                  onClick={() => setRankingCriterion('streak')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    rankingCriterion === 'streak'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Maior Ofensiva
                </button>
              </div>
            </div>

            {/* Seletor de Ano */}
            {rankingCriterion !== 'streak' ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ano:</span>
                </span>
                <select
                  value={rankingYear}
                  onChange={(e) => setRankingYear(Number(e.target.value))}
                  className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {RANKING_YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y} className="bg-slate-900 text-white">
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="text-[11px] text-slate-500 bg-slate-800/60 px-2.5 py-1 rounded-xl border border-slate-700/40">
                Sequência ativa contínua
              </span>
            )}
          </div>

          {isRankingsLoading ? (
            <div className="py-16 text-center text-slate-400 text-xs animate-pulse">
              Calculando classificações entre amigos...
            </div>
          ) : rankings.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 rounded-3xl border border-slate-800 space-y-2">
              <Trophy className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="text-sm font-bold text-white">Nenhum dado de ranking para este período</h3>
              <p className="text-xs text-slate-400">Comece a ler para liderar o placar!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Pódio (Top 3) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {rankings.slice(0, 3).map((item) => (
                  <div
                    key={item.user.id}
                    onClick={() => setSelectedUsername(item.user.username)}
                    className={`relative p-5 rounded-3xl border transition cursor-pointer flex flex-col items-center text-center ${
                      item.rank === 1
                        ? 'bg-gradient-to-b from-amber-500/15 via-slate-900 to-slate-900 border-amber-500/40 shadow-lg shadow-amber-500/5 sm:-translate-y-2'
                        : item.rank === 2
                        ? 'bg-gradient-to-b from-slate-400/15 via-slate-900 to-slate-900 border-slate-400/30'
                        : 'bg-gradient-to-b from-orange-600/15 via-slate-900 to-slate-900 border-orange-600/30'
                    }`}
                  >
                    <div className="text-2xl mb-2">
                      {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : '🥉'}
                    </div>

                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white font-extrabold flex items-center justify-center text-xl shadow-md mb-2">
                      {item.user.display_name?.charAt(0).toUpperCase() || 'U'}
                    </div>

                    <h4 className="text-sm font-bold text-white truncate max-w-full">
                      {item.user.display_name}
                      {item.is_current_user && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full ml-1">
                          Você
                        </span>
                      )}
                    </h4>
                    <span className="text-xs text-slate-400 mb-3">@{item.user.username}</span>

                    <div className="mt-auto px-4 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
                      <strong className="text-white font-extrabold text-sm mr-1">{item.score}</strong>
                      <span className="text-slate-400">{item.score_label}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabela de Classificação Completa */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-3xl overflow-hidden shadow">
                <div className="p-4 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Tabela Completa
                </div>

                <div className="divide-y divide-slate-800/60">
                  {rankings.map((item) => (
                    <div
                      key={item.user.id}
                      onClick={() => setSelectedUsername(item.user.username)}
                      className={`flex items-center justify-between p-4 hover:bg-slate-800/40 transition cursor-pointer ${
                        item.is_current_user ? 'bg-emerald-500/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span
                          className={`w-6 text-center text-xs font-extrabold ${
                            item.rank === 1
                              ? 'text-amber-400 text-sm'
                              : item.rank === 2
                              ? 'text-slate-300'
                              : item.rank === 3
                              ? 'text-orange-400'
                              : 'text-slate-500'
                          }`}
                        >
                          #{item.rank}
                        </span>

                        <div className="w-9 h-9 rounded-xl bg-slate-800 text-emerald-400 font-bold flex items-center justify-center text-xs shadow border border-slate-700">
                          {item.user.display_name?.charAt(0).toUpperCase() || 'U'}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white">{item.user.display_name}</span>
                            {item.is_current_user && (
                              <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded-full">
                                Você
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">@{item.user.username}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-extrabold text-white block">{item.score}</span>
                        <span className="text-[10px] text-slate-400">{item.score_label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA 3: DESCOBRIR LEITORES & PEDIDOS */}
      {activeTab === 'discover' && (
        <div className="space-y-6">
          {/* Solicitações Pendentes (se houver) */}
          {pendingRequests.length > 0 && (
            <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-3xl space-y-3">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                Solicitações de Amizade Pendentes ({pendingRequests.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-3"
                  >
                    <div
                      onClick={() => setSelectedUsername(req.follower.username)}
                      className="flex items-center gap-2.5 cursor-pointer"
                    >
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs">
                        {req.follower.display_name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">{req.follower.display_name}</span>
                        <span className="text-[11px] text-slate-400">@{req.follower.username}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleRespondRequest(req.id, 'accept')}
                        className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition cursor-pointer"
                        title="Aceitar"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRespondRequest(req.id, 'reject')}
                        className="p-1.5 bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
                        title="Recusar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Campo de Busca */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar leitores por nome de usuário ou display name..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-semibold shadow transition cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isSearching ? 'Buscando...' : 'Buscar'}</span>
            </button>
          </form>

          {/* Resultados de Busca */}
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="p-4 bg-slate-900/70 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-700 transition"
                >
                  <div
                    onClick={() => setSelectedUsername(user.username)}
                    className="flex items-center gap-3 cursor-pointer min-w-0"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white font-extrabold flex items-center justify-center text-sm shadow shrink-0">
                      {user.display_name?.charAt(0).toUpperCase() || 'U'}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{user.display_name}</h4>
                      <p className="text-[11px] text-slate-400 truncate">@{user.username}</p>
                      {user.bio && (
                        <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{user.bio}</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleFollow(user.username, user.is_following)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                      user.is_following
                        ? 'bg-slate-800 text-slate-300 hover:bg-rose-500/10 hover:text-rose-400'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                    }`}
                  >
                    {user.is_following ? 'Seguindo' : 'Seguir'}
                  </button>
                </div>
              ))}
            </div>
          ) : searchQuery && !isSearching ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Nenhum leitor encontrado com o termo "{searchQuery}".
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs space-y-1">
              <Users className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p>Digite um nome ou arroba para encontrar leitores e expandir seu círculo de leitura.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal de Quem Curtiu a Postagem */}
      {likesModalActivityId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-md max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl">
            <div className="shrink-0 flex items-center justify-between px-4 py-3.5 sm:px-5 sm:py-4 border-b border-slate-800 bg-slate-900/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                  <Heart className="w-4 h-4 fill-rose-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">Curtidas na publicação</h3>
                  <p className="text-[11px] text-slate-400">
                    {activityLikers.length} {activityLikers.length === 1 ? 'pessoa curtiu' : 'pessoas curtiram'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLikesModalActivityId(null)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-full transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-2.5">
              {isLikersLoading && activityLikers.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-rose-400" />
                  <span className="text-xs">Carregando curtidas...</span>
                </div>
              ) : activityLikers.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  Nenhuma curtida encontrada.
                </div>
              ) : (
                activityLikers.map((liker) => (
                  <button
                    type="button"
                    key={liker.id}
                    onClick={() => {
                      setLikesModalActivityId(null)
                      setSelectedUsername(liker.username)
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-slate-950/60 hover:bg-slate-800/70 border border-slate-800/80 transition text-left cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white font-bold flex items-center justify-center text-sm shrink-0">
                      {liker.display_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-white truncate">
                        {liker.display_name}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono truncate">@{liker.username}</p>
                    </div>
                    <Heart className="w-4 h-4 text-rose-400 fill-rose-400 shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Perfil do Leitor */}
      {selectedUsername && (
        <UserProfileModal
          username={selectedUsername}
          onClose={() => setSelectedUsername(null)}
          onFollowChanged={() => {
            queryClient.invalidateQueries({ queryKey: ['social-rankings'] })
            queryClient.invalidateQueries({ queryKey: ['social-feed'] })
          }}
        />
      )}
    </div>
  )
}
