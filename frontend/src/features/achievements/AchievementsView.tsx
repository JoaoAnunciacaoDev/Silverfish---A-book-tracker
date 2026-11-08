import { useState } from 'react'
import type { AchievementView } from '@/types/achievements'
import {
  Award,
  BookOpen,
  CheckCircle2,
  Crown,
  Flame,
  Layers,
  Library,
  Lock,
  Smile,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from 'lucide-react'

interface AchievementsViewProps {
  achievements: AchievementView[]
  unlockedCount: number
  totalCount: number
}

export function AchievementsView({
  achievements,
  unlockedCount,
  totalCount,
}: AchievementsViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const categories = [
    { id: 'all', label: 'Todas' },
    { id: 'pages', label: 'Páginas' },
    { id: 'books', label: 'Livros' },
    { id: 'streak', label: 'Ofensiva' },
    { id: 'reading', label: 'Hábito' },
    { id: 'shelf', label: 'Estante' },
    { id: 'social', label: 'Avaliações' },
  ]

  const filteredAchievements = achievements.filter((ach) => {
    if (selectedCategory === 'all') return true
    if (selectedCategory === 'social') {
      return ach.category === 'social' || ach.category === 'reviews'
    }
    return ach.category === selectedCategory
  })

  const percentComplete = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0

  const getIcon = (iconName: string, unlocked: boolean) => {
    const props = {
      className: `w-6 h-6 transition-transform duration-300 group-hover:scale-110 ${
        unlocked ? 'text-amber-400' : 'text-slate-500'
      }`,
    }

    switch (iconName) {
      case 'BookOpen':
        return <BookOpen {...props} />
      case 'Sparkles':
        return <Sparkles {...props} />
      case 'Zap':
        return <Zap {...props} />
      case 'Award':
        return <Award {...props} />
      case 'CheckCircle2':
        return <CheckCircle2 {...props} />
      case 'Library':
        return <Library {...props} />
      case 'Crown':
        return <Crown {...props} />
      case 'Flame':
        return <Flame {...props} />
      case 'Star':
        return <Star {...props} />
      case 'Layers':
        return <Layers {...props} />
      case 'Smile':
        return <Smile {...props} />
      default:
        return <Trophy {...props} />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header com Progresso Geral */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-amber-950/20 border border-amber-500/20 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400">
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Quadro de Conquistas
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  {percentComplete}%
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Desbloqueie medalhas exclusivas evoluindo sua rotina e hábitos de leitura
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end">
            <div className="text-2xl font-black text-amber-400">
              {unlockedCount} <span className="text-sm font-medium text-slate-400">/ {totalCount}</span>
            </div>
            <span className="text-xs text-slate-400">Medalhas desbloqueadas</span>
          </div>
        </div>

        {/* Barra de progresso geral */}
        <div className="mt-5 w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-700/60">
          <div
            className="bg-gradient-to-r from-amber-500 via-emerald-400 to-emerald-500 h-full rounded-full transition-all duration-700"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      {/* Filtros por categoria */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid de Conquistas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map((ach) => (
          <div
            key={ach.code}
            className={`group rounded-2xl p-4 border transition-all duration-300 flex flex-col justify-between ${
              ach.unlocked
                ? 'bg-slate-900/80 border-amber-500/30 shadow-lg shadow-amber-950/10 hover:border-amber-400/50'
                : 'bg-slate-900/40 border-slate-800/80 opacity-75 hover:opacity-90'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`p-3 rounded-xl border transition ${
                    ach.unlocked
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-slate-800/60 border-slate-700/50'
                  }`}
                >
                  {getIcon(ach.icon, ach.unlocked)}
                </div>

                {ach.unlocked ? (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Conquistada</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700/60">
                    <Lock className="w-3 h-3 text-slate-500" />
                    <span>Bloqueada</span>
                  </span>
                )}
              </div>

              <div className="mt-3">
                <h3 className="text-sm font-bold text-white group-hover:text-amber-200 transition">
                  {ach.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {ach.description}
                </p>
              </div>
            </div>

            {/* Progresso do Desafio */}
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-slate-400">Progresso</span>
                <span className={`font-semibold ${ach.unlocked ? 'text-amber-300' : 'text-slate-300'}`}>
                  {ach.unlocked ? (
                    ach.unlocked_at ? (
                      `Desbloqueado em ${new Date(ach.unlocked_at).toLocaleDateString('pt-BR')}`
                    ) : (
                      'Concluído!'
                    )
                  ) : (
                    `${ach.current_value} / ${ach.target_value}`
                  )}
                </span>
              </div>

              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    ach.unlocked ? 'bg-amber-400' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${ach.progress_percent}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
