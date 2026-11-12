import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getGoal } from '@/api/goals'
import { SetGoalModal } from './SetGoalModal'
import { CheckCircle2, Edit2, Target } from 'lucide-react'

interface DailyGoalWidgetProps {
  refreshTrigger?: number
}

export function DailyGoalWidget({ refreshTrigger }: DailyGoalWidgetProps) {
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data, refetch } = useQuery({
    queryKey: ['goal'],
    queryFn: getGoal,
  })

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      refetch()
    }
  }, [refreshTrigger, refetch])

  const target = data?.daily_page_target || 20
  const pagesRead = data?.today.pages_read || 0
  const percentage = data?.today.percentage || 0
  const isMet = data?.today.met || false

  return (
    <>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <Target className="w-4 h-4 text-emerald-400" />
            <span>Meta Diaria</span>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-1 text-slate-500 hover:text-slate-300 rounded transition cursor-pointer"
            title="Alterar meta"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white">
              {pagesRead}{' '}
              <span className="text-xs font-normal text-slate-400">/ {target} pags</span>
            </span>
            {isMet && (
              <span className="inline-flex items-center space-x-1 text-emerald-400 text-[11px] font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                <span>Cumprida</span>
              </span>
            )}
          </div>

          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isMet ? 'bg-emerald-400' : 'bg-emerald-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <div className="text-[11px] text-slate-500">
          {isMet
            ? 'Meta de hoje alcancada com sucesso.'
            : `Faltam ${Math.max(0, target - pagesRead)} paginas para atingir o objetivo.`}
        </div>
      </div>

      <SetGoalModal
        currentTarget={target}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['goal'] })
          queryClient.invalidateQueries({ queryKey: ['streak'] })
        }}
      />
    </>
  )
}
