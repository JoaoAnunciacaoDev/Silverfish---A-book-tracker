import { useEffect, useState } from 'react'
import { BookOpen, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'

interface HealthResponse {
  status: string
  service: string
  timestamp: string
  database: string
}

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkHealth = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/health')
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`)
      
      const data: HealthResponse = await response.json()
      setHealth(data)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Falha ao conectar com o backend')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Silverfish</h1>
            <p className="text-sm text-slate-400">Plataforma de Incentivo à Leitura</p>
          </div>
        </div>
        
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Status do Backend
            </span>
            <button
              onClick={checkHealth}
              disabled={loading}
              className="text-slate-400 hover:text-white transition disabled:opacity-50"
              title="Recarregar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading && (
            <p className="text-sm text-slate-400">Conectando à API...</p>
          )}

          {error && (
            <div className="flex items-start space-x-2 text-rose-400 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Backend desconectado</p>
                <p className="text-xs text-rose-400/80 mt-0.5">
                  Certifique-se de que o backend está rodando na porta 8080.
                </p>
              </div>
            </div>
          )}

          {health && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 text-sm font-medium">
                <CheckCircle className="w-5 h-5" />
                <span>Backend conectado com sucesso!</span>
              </div>
              <div className="text-xs font-mono text-slate-400 space-y-1 bg-slate-900 p-3 rounded-lg border border-slate-800">
                <p><strong className="text-slate-300">Serviço:</strong> {health.service}</p>
                <p><strong className="text-slate-300">Banco:</strong> {health.database}</p>
                <p><strong className="text-slate-300">Horário:</strong> {new Date(health.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
          )}
        </div>

        <div className="text-center">
          <span className="text-xs text-slate-400">
            Frontend Base pronto
          </span>
        </div>

      </div>
    </div>
  )
}

export default App