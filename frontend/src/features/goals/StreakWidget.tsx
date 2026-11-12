import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getStreak } from '@/api/goals'
import { Flame, Trophy } from 'lucide-react'

interface StreakWidgetProps {
  refreshTrigger?: number
}

export function StreakWidget({ refreshTrigger }: StreakWidgetProps) {
  const { data, refetch } = useQuery({
    queryKey: ['streak'],
    queryFn: getStreak,
  })

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      refetch()
    }
  }, [refreshTrigger, refetch])

  const currentStreak = data?.current_streak || 0
  const bestStreak = data?.best_streak || 0
  const todayMet = data?.today_met || false

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
          <Flame className="w-4 h-4 text-amber-500" />
          <span>Sequencia</span>
        </div>
        <div className="flex items-center space-x-1 text-[11px] text-slate-400">
          <Trophy className="w-3 h-3 text-amber-500" />
          <span>Recorde: {bestStreak}d</span>
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-2xl font-bold text-white">
          {currentStreak} <span className="text-xs font-normal text-slate-400">dias seguidos</span>
        </div>
        <div className="text-[11px] text-slate-500">
          {todayMet
            ? 'Voce ja manteve sua sequencia ativa hoje.'
            : currentStreak > 0
            ? 'Leia hoje para nao perder sua sequencia.'
            : 'Leia e cumpra sua meta diaria para iniciar sua sequencia.'}
        </div>
      </div>
    </div>
  )
}
