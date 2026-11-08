import { useState, useEffect } from 'react'
import { getPrivacySettings, updatePrivacySettings, updateUserProfile } from '@/api/social'
import type { UserPrivacySettings } from '@/types/social'
import { useAuth } from '@/features/auth/AuthContext'
import { X, Lock, Shield, User, Check, Globe } from 'lucide-react'

interface PrivacySettingsModalProps {
  onClose: () => void
}

export function PrivacySettingsModal({ onClose }: PrivacySettingsModalProps) {
  const { user, refreshUser } = useAuth()
  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [isPrivate, setIsPrivate] = useState(user?.is_private || false)
  const [privacy, setPrivacy] = useState<UserPrivacySettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)

    getPrivacySettings()
      .then((data) => {
        if (isMounted) {
          setPrivacy(data.privacy)
          setIsPrivate(data.is_private)
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar privacidade:', err)
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setFeedback(null)

    try {
      // 1. Atualiza dados do perfil
      await updateUserProfile({
        display_name: displayName.trim(),
        bio: bio.trim(),
        is_private: isPrivate,
      })

      // 2. Atualiza configurações de privacidade granular se carregadas
      if (privacy) {
        await updatePrivacySettings({
          profile_visibility: privacy.profile_visibility,
          library_visibility: privacy.library_visibility,
          stats_visibility: privacy.stats_visibility,
          journal_visibility: privacy.journal_visibility,
          is_private: isPrivate,
        })
      }

      await refreshUser()
      setFeedback('Alterações salvas com sucesso!')
      setTimeout(() => {
        onClose()
      }, 1200)
    } catch (err: any) {
      setFeedback(err.message || 'Erro ao salvar alterações')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Perfil & Privacidade</h3>
              <p className="text-xs text-slate-400">Configure suas informações e visibilidade social</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-full transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Seção de Perfil */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Dados do Perfil
            </h4>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Nome de Exibição</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                maxLength={50}
                className="w-full px-3.5 py-2.5 bg-slate-800/70 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Biografia <span className="text-slate-500 font-normal">({bio.length}/250)</span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={250}
                rows={3}
                placeholder="Conte um pouco sobre suas leituras e autores favoritos..."
                className="w-full px-3.5 py-2.5 bg-slate-800/70 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 transition resize-none"
              />
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* Seção de Privacidade da Conta */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Privacidade da Conta
            </h4>

            <label className="flex items-start gap-3 p-3.5 bg-slate-800/40 border border-slate-800 hover:border-slate-700 rounded-2xl cursor-pointer transition">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-white block mb-0.5">Conta Privada</span>
                <span className="text-slate-400 block leading-relaxed">
                  Apenas seguidores que você aprovar poderão ver sua estante, conquistas e sessões de leitura.
                </span>
              </div>
            </label>

            {/* Configurações granulares */}
            {privacy && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    Quem pode ver minha Estante:
                  </label>
                  <select
                    value={privacy.library_visibility}
                    onChange={(e) =>
                      setPrivacy({
                        ...privacy,
                        library_visibility: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="public">Todos (Público)</option>
                    <option value="followers">Apenas Seguidores</option>
                    <option value="private">Apenas Eu (Privado)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    Quem pode ver minhas Estatísticas e Streaks:
                  </label>
                  <select
                    value={privacy.stats_visibility}
                    onChange={(e) =>
                      setPrivacy({
                        ...privacy,
                        stats_visibility: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="public">Todos (Público)</option>
                    <option value="followers">Apenas Seguidores</option>
                    <option value="private">Apenas Eu (Privado)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold text-center ${
                feedback.includes('sucesso')
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {feedback}
            </div>
          )}

          {/* Botões */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || isLoading}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-500/20 transition cursor-pointer flex items-center gap-1.5"
            >
              {isSaving ? (
                'Salvando...'
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Salvar Preferências
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
