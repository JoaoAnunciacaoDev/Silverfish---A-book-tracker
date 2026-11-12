import { useState, useEffect } from 'react'
import {
  getNotificationSettings,
  updateNotificationSettings,
  getVapidPublicKey,
  subscribePush,
  unsubscribePush,
  sendTestNotification,
} from '@/api/notifications'
import type { NotificationSettings } from '@/types/notifications'
import { X, Bell, BellOff, Clock, Flame, Check, AlertCircle, Smartphone } from 'lucide-react'

const HOURLY_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, '0')
  return `${h}:00`
})

interface NotificationSettingsModalProps {
  onClose: () => void
}

export function NotificationSettingsModal({ onClose }: NotificationSettingsModalProps) {
  const [settings, setSettings] = useState<NotificationSettings>({
    daily_reminder_enabled: true,
    reminder_time: '20:00',
    streak_alert_enabled: true,
    social_notifications_enabled: true,
  })
  const [activeDevices, setActiveDevices] = useState(0)
  const [isDeviceSubscribed, setIsDeviceSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)

    getNotificationSettings()
      .then((data) => {
        if (isMounted) {
          setSettings(data.settings)
          setActiveDevices(data.active_devices_count)
        }
      })
      .catch((err) => console.error('Erro ao buscar preferências de notificação:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    // Checa se este navegador específico já possui inscrição ativa no PushManager
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          if (isMounted) {
            setIsDeviceSubscribed(Boolean(sub))
          }
        })
        .catch(() => {})
    }

    return () => {
      isMounted = false
    }
  }, [])

  const handleDisablePushInBrowser = async () => {
    setIsSubscribing(true)
    setFeedback(null)

    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          const endpoint = sub.endpoint
          await sub.unsubscribe()
          await unsubscribePush(endpoint).catch(() => {})
        }
      }

      setIsDeviceSubscribed(false)
      setActiveDevices((prev) => Math.max(0, prev - 1))
      setFeedback('Notificações desativadas com sucesso neste aparelho.')
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback(err.message)
      } else {
        setFeedback('Erro ao desativar notificações neste aparelho.')
      }
    } finally {
      setIsSubscribing(false)
    }
  }

  const handleEnablePushInBrowser = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setFeedback('Seu navegador não suporta notificações Web Push.')
      return
    }

    setIsSubscribing(true)
    setFeedback(null)

    try {
      const permission = await Notification.requestPermission()
      setBrowserPermission(permission)

      if (permission !== 'granted') {
        throw new Error('Permissão de notificações não concedida no navegador.')
      }

      // 1. Registra Service Worker
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // 2. Obtém chave pública VAPID do backend
      const { vapid_public_key } = await getVapidPublicKey()
      if (!vapid_public_key) {
        throw new Error('Serviço de notificações Web Push não configurado no servidor (VAPID_PUBLIC_KEY ausente).')
      }

      // Converte VAPID base64url para Uint8Array
      const padding = '='.repeat((4 - (vapid_public_key.length % 4)) % 4)
      const base64 = (vapid_public_key + padding).replace(/-/g, '+').replace(/_/g, '/')
      const rawData = window.atob(base64)
      const outputArray = new Uint8Array(rawData.length)
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
      }

      // 3. Inscreve o pushManager
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: outputArray,
      })

      const subJSON = subscription.toJSON()
      if (!subJSON.endpoint || !subJSON.keys) {
        throw new Error('Falha ao gerar credenciais da inscrição no navegador.')
      }

      // 4. Salva no backend
      await subscribePush({
        endpoint: subJSON.endpoint,
        keys: {
          p256dh: subJSON.keys.p256dh || '',
          auth: subJSON.keys.auth || '',
        },
        user_agent: navigator.userAgent,
      })

      setIsDeviceSubscribed(true)
      setActiveDevices((prev) => prev + 1)
      setFeedback('Dispositivo ativado com sucesso para receber notificações!')
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback(err.message)
      } else {
        setFeedback('Erro ao habilitar notificações no navegador.')
      }
    } finally {
      setIsSubscribing(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setFeedback(null)

    try {
      await updateNotificationSettings(settings)
      setFeedback('Preferências salvas com sucesso!')
      setTimeout(() => {
        onClose()
      }, 1200)
    } catch (err: any) {
      setFeedback(err.message || 'Erro ao salvar preferências')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestNotification = async () => {
    setIsTesting(true)
    setFeedback(null)

    try {
      const res = await sendTestNotification()
      setFeedback(res.message)

      // Exibe notificação local compatível com Mobile (PWA/Android/iOS) e Desktop
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready
          await reg.showNotification(res.payload.title, {
            body: res.payload.body,
            icon: res.payload.icon || '/favicon.svg',
            badge: '/favicon.svg',
          })
          return
        } catch {
          // Fallback silencioso caso o Service Worker não esteja pronto
        }
      }

      // Fallback para navegadores desktop que suportem o construtor window.Notification
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(res.payload.title, {
            body: res.payload.body,
            icon: res.payload.icon,
          })
        } catch {
          // Dispositivos móveis lançam 'Illegal constructor' aqui, ignorado com segurança
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback(err.message)
      } else {
        setFeedback('Erro ao enviar notificação de teste')
      }
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-lg max-h-[90dvh] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white">Lembretes & Notificações</h3>
              <p className="text-xs text-slate-400">Configure seus horários de leitura e alertas</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-full transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSave} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Card de Ativação do Dispositivo */}
          <div className="p-4 bg-slate-800/40 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Notificações neste Aparelho</span>
              </div>
              <span className="text-[11px] text-slate-400">{activeDevices} dispositivo(s) conectado(s)</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {isDeviceSubscribed
                ? 'Este aparelho está ativo e configurado para receber alertas de leitura.'
                : 'Ative para receber lembretes de leitura mesmo com a aba fechada.'}
            </p>

            {browserPermission === 'denied' && (
              <p className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
                As notificações estão bloqueadas nas configurações do navegador. Clique no ícone de configurações ao lado da URL para permitir.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {isDeviceSubscribed ? (
                <button
                  type="button"
                  onClick={handleDisablePushInBrowser}
                  disabled={isSubscribing}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  <BellOff className="w-3.5 h-3.5" />
                  {isSubscribing ? 'Desativando...' : 'Desativar neste Aparelho'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleEnablePushInBrowser}
                  disabled={isSubscribing || browserPermission === 'denied'}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-white transition cursor-pointer flex items-center gap-1.5"
                >
                  <Bell className="w-3.5 h-3.5" />
                  {isSubscribing ? 'Ativando...' : 'Ativar neste Aparelho'}
                </button>
              )}

              <button
                type="button"
                onClick={handleTestNotification}
                disabled={isTesting || activeDevices === 0}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer disabled:opacity-40"
              >
                {isTesting ? 'Enviando...' : 'Enviar Teste'}
              </button>
            </div>
          </div>

          {/* Opções de Horário e Alertas */}
          <div className="space-y-4">
            <label className="flex items-start gap-3 p-3.5 bg-slate-800/30 border border-slate-800 rounded-2xl cursor-pointer hover:border-slate-700 transition">
              <input
                type="checkbox"
                checked={settings.daily_reminder_enabled}
                onChange={(e) =>
                  setSettings({ ...settings, daily_reminder_enabled: e.target.checked })
                }
                className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <div className="text-xs flex-1">
                <span className="font-semibold text-white block mb-0.5">Lembrete Diário de Leitura</span>
                <span className="text-slate-400 block leading-relaxed mb-2">
                  Receba um lembrete no horário agendado caso ainda não tenha lido no dia.
                </span>

                {settings.daily_reminder_enabled && (
                  <div className="flex items-center gap-2 pt-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-300 text-xs font-medium">Horário:</span>
                    <select
                      value={
                        HOURLY_OPTIONS.includes(settings.reminder_time)
                          ? settings.reminder_time
                          : (settings.reminder_time?.split(':')[0]?.padStart(2, '0') || '20') + ':00'
                      }
                      onChange={(e) =>
                        setSettings({ ...settings, reminder_time: e.target.value })
                      }
                      className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {HOURLY_OPTIONS.map((hour) => (
                        <option key={hour} value={hour}>
                          {hour}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 bg-slate-800/30 border border-slate-800 rounded-2xl cursor-pointer hover:border-slate-700 transition">
              <input
                type="checkbox"
                checked={settings.streak_alert_enabled}
                onChange={(e) =>
                  setSettings({ ...settings, streak_alert_enabled: e.target.checked })
                }
                className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <div className="text-xs flex-1">
                <span className="font-semibold text-white flex items-center gap-1 mb-0.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  Alerta de Ofensiva em Risco
                </span>
                <span className="text-slate-400 block leading-relaxed">
                  Aviso de emergência caso sua ofensiva diária vá expirar antes da meia-noite.
                </span>
              </div>
            </label>
          </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-1.5 ${
                  feedback.includes('sucesso') || feedback.includes('perfeitamente')
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{feedback}</span>
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="shrink-0 flex items-center justify-end gap-3 px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-800 bg-slate-900/95">
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
