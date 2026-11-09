import { useEffect, useState, useMemo } from 'react'
import { getDashboardStats, getHeatmapData } from '@/api/stats'
import { listAchievements } from '@/api/achievements'
import type { DashboardStats, DayActivity } from '@/types/stats'
import type { AchievementView } from '@/types/achievements'
import { AchievementsView } from '@/features/achievements/AchievementsView'
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Flame,
  Layers,
  LineChart,
  Loader2,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from 'lucide-react'

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activities, setActivities] = useState<DayActivity[]>([])
  const [achievements, setAchievements] = useState<AchievementView[]>([])
  const [unlockedCount, setUnlockedCount] = useState(0)
  const [totalAchievementsCount, setTotalAchievementsCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [hoveredDay, setHoveredDay] = useState<{ date: string; pages: number; sessions: number } | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        const [statsData, heatmapData, achievementsData] = await Promise.all([
          getDashboardStats(),
          getHeatmapData(),
          listAchievements(),
        ])
        setStats(statsData)
        setActivities(heatmapData.activities || [])
        setAchievements(achievementsData.achievements || [])
        setUnlockedCount(achievementsData.unlocked_count || 0)
        setTotalAchievementsCount(achievementsData.total_count || 0)
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Mapa de datas (YYYY-MM-DD -> { pages, sessions })
  const activityMap = useMemo(() => {
    const map = new Map<string, { pages: number; sessions: number }>()
    for (const act of activities) {
      map.set(act.date, { pages: act.pages, sessions: act.sessions })
    }
    return map
  }, [activities])

  // Gera os 365 dias do ano até hoje
  const daysGrid = useMemo(() => {
    const days: { dateStr: string; dayOfWeek: number; pages: number; sessions: number }[] = []
    const today = new Date()

    // 52 semanas = 364 dias + dias restantes até alinhar com a semana
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      const data = activityMap.get(dateStr) || { pages: 0, sessions: 0 }
      days.push({
        dateStr,
        dayOfWeek: d.getDay(), // 0 = Domingo, 6 = Sábado
        pages: data.pages,
        sessions: data.sessions,
      })
    }

    return days
  }, [activityMap])

  // Agrupa dias em semanas (colunas)
  const weeks = useMemo(() => {
    const cols: typeof daysGrid[] = []
    let currentWeek: typeof daysGrid = []

    for (const day of daysGrid) {
      currentWeek.push(day)
      if (day.dayOfWeek === 6) {
        cols.push(currentWeek)
        currentWeek = []
      }
    }
    if (currentWeek.length > 0) {
      cols.push(currentWeek)
    }

    return cols
  }, [daysGrid])

  const getHeatmapColor = (pages: number) => {
    if (pages === 0) return 'bg-slate-900 border-slate-800/80 hover:border-slate-600'
    if (pages <= 15) return 'bg-emerald-950/90 border-emerald-900 text-emerald-300 hover:border-emerald-700'
    if (pages <= 35) return 'bg-emerald-800/90 border-emerald-700 text-emerald-200 hover:border-emerald-500'
    if (pages <= 60) return 'bg-emerald-600 border-emerald-500 text-white hover:border-emerald-400'
    return 'bg-emerald-400 border-emerald-300 text-slate-950 hover:border-white'
  }

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-sm">Carregando painel analítico...</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="py-12 text-center text-slate-500">
        Não foi possível carregar as informações do dashboard.
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <LineChart className="w-6 h-6 text-emerald-400" />
            <span>Painel de Leitura & Estatísticas</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Acompanhe seu progresso, consistência diária e evolução do seu hábito literário.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-2xl">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-300">
            {stats.streaks.current > 0
              ? `Ofensiva ativa: ${stats.streaks.current} dias seguidos!`
              : 'Leia hoje para iniciar uma ofensiva!'}
          </span>
        </div>
      </div>

      {/* Grid de Métricas Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Páginas Totais */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] sm:text-xs font-semibold">Páginas Lidas (Total)</span>
            <div className="p-1.5 sm:p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white">
            {stats.pages.total.toLocaleString('pt-BR')}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400">
            <span className="text-emerald-400 font-semibold">{stats.pages.this_year}</span> neste ano
          </p>
        </div>

        {/* Livros Concluídos */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] sm:text-xs font-semibold">Livros Concluídos</span>
            <div className="p-1.5 sm:p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white">
            {stats.books.read}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400">
            {stats.books.reading} lendo • {stats.books.in_collection} na coleção
          </p>
        </div>

        {/* Ofensiva / Sequência */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] sm:text-xs font-semibold">Ofensiva Atual</span>
            <div className="p-1.5 sm:p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400 text-amber-400" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-amber-400">
            {stats.streaks.current} <span className="text-xs sm:text-sm font-semibold text-slate-400">dias</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400">
            Recorde: <span className="text-amber-400 font-semibold">{stats.streaks.best} dias</span>
          </p>
        </div>

        {/* Média Diária & Consistência */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] sm:text-xs font-semibold">Média por Dia Ativo</span>
            <div className="p-1.5 sm:p-2 bg-sky-500/10 text-sky-400 rounded-xl">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white">
            {stats.pages.daily_average > 0 ? stats.pages.daily_average.toFixed(1) : 0}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400">
            <span className="text-sky-400 font-semibold">{stats.pages.active_days}</span> dias ativos
          </p>
        </div>
      </div>

      {/* Cards Secundários */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex items-center space-x-3">
          <div className="p-2 sm:p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Este Mês</span>
            <p className="text-base sm:text-lg font-bold text-white">{stats.pages.this_month} páginas</p>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex items-center space-x-3">
          <div className="p-2 sm:p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Últimos 7 Dias</span>
            <p className="text-base sm:text-lg font-bold text-white">{stats.pages.last_7_days} páginas</p>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex items-center space-x-3">
          <div className="p-2 sm:p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
            <Star className="w-4 h-4 sm:w-5 sm:h-5 fill-amber-400 text-amber-400" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Avaliações & Resenhas</span>
            <p className="text-base sm:text-lg font-bold text-white">{stats.reviews_count} publicadas</p>
          </div>
        </div>
      </div>

      {/* Calendário de Contribuições de Leitura (Estilo GitHub) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Consistência de Leitura nos Últimos 365 Dias</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Cada quadrado representa a intensidade de páginas lidas no dia.
            </p>
            <span className="sm:hidden text-[10px] text-slate-500 mt-1 block">
              ← Deslize horizontalmente para navegar pelo ano →
            </span>
          </div>

          {/* Legenda */}
          <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 self-end sm:self-auto">
            <span>Menos</span>
            <div className="w-3 h-3 rounded-xs bg-slate-900 border border-slate-800" />
            <div className="w-3 h-3 rounded-xs bg-emerald-950 border border-emerald-900" />
            <div className="w-3 h-3 rounded-xs bg-emerald-800 border border-emerald-700" />
            <div className="w-3 h-3 rounded-xs bg-emerald-600 border border-emerald-500" />
            <div className="w-3 h-3 rounded-xs bg-emerald-400 border border-emerald-300" />
            <span>Mais</span>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="overflow-x-auto pb-2 scrollbar-none">
          <div className="inline-flex gap-1.5 p-1 min-w-[720px]">
            {weeks.map((week, wIndex) => (
              <div key={wIndex} className="flex flex-col gap-1.5">
                {week.map((day) => (
                  <div
                    key={day.dateStr}
                    onMouseEnter={() =>
                      setHoveredDay({
                        date: day.dateStr,
                        pages: day.pages,
                        sessions: day.sessions,
                      })
                    }
                    onMouseLeave={() => setHoveredDay(null)}
                    className={`w-3.5 h-3.5 rounded-xs border transition-all cursor-pointer ${getHeatmapColor(
                      day.pages
                    )}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Tooltip Dinâmico do Heatmap */}
        <div className="h-6 flex items-center text-xs text-slate-300">
          {hoveredDay ? (
            <span className="inline-flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
              <span className="font-semibold text-emerald-400">{hoveredDay.pages} páginas</span> em{' '}
              {new Date(hoveredDay.date + 'T12:00:00').toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}{' '}
              ({hoveredDay.sessions} {hoveredDay.sessions === 1 ? 'sessão' : 'sessões'})
            </span>
          ) : (
            <span className="text-slate-500 text-[11px]">
              Passe o cursor sobre os quadrados para ver os detalhes de cada dia.
            </span>
          )}
        </div>
      </div>

      {/* Histórico Mensal */}
      {stats.monthly_overview && stats.monthly_overview.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Evolução Mensal no Ano</span>
          </h3>

          <div className="space-y-3">
            {stats.monthly_overview.map((m) => {
              const maxPages = Math.max(...stats.monthly_overview.map((x) => x.pages), 1)
              const percent = Math.min(100, Math.round((m.pages / maxPages) * 100))

              const monthLabel = new Date(m.month + '-01T12:00:00').toLocaleDateString('pt-BR', {
                month: 'long',
                year: 'numeric',
              })

              return (
                <div key={m.month} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="capitalize text-slate-300 font-medium">{monthLabel}</span>
                    <span className="font-semibold text-emerald-400">
                      {m.pages} páginas ({m.sessions} {m.sessions === 1 ? 'sessão' : 'sessões'})
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Galeria de Conquistas & Gamificação */}
      <AchievementsView
        achievements={achievements}
        unlockedCount={unlockedCount}
        totalCount={totalAchievementsCount}
      />
    </div>
  )
}
