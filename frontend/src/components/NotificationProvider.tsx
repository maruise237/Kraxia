import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getAccessToken, getSession, listSessions } from '../lib/api'

export interface AppNotification {
  id: string
  sessionKey: string
  title: string
  preview: string
  createdAt: string
  read: boolean
}

interface NotificationContextValue {
  notifications: AppNotification[]
  unreadCount: number
  openSessionNotification: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  registerPendingSession: (sessionKey: string, baselineAssistantCount: number) => void
  clearPendingSession: (sessionKey: string) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

const STORAGE_KEY = 'openclaw_notifications'

interface PendingSession {
  sessionKey: string
  baselineAssistantCount: number
  startedAt: string
}

function normalizeSessionKey(key: string): string {
  return key.replace(/:/g, '')
}

async function resolveSessionKey(rawSessionKey: string): Promise<string | null> {
  if (rawSessionKey.includes(':')) return rawSessionKey

  try {
    const sessions = await listSessions()
    const matched = sessions.find(item => normalizeSessionKey(item.key) === normalizeSessionKey(rawSessionKey))
    return matched?.key || null
  } catch {
    return null
  }
}

function getCurrentChatSession(location: ReturnType<typeof useLocation>): string | null {
  if (location.pathname !== '/chat') return null
  return new URLSearchParams(location.search).get('session')
}

function summarize(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return "L'assistant a répondu"
  return normalized.length > 80 ? `${normalized.slice(0, 80)}...` : normalized
}

function titleFromSessionKey(sessionKey: string): string {
  const parts = sessionKey.split(':')
  if (parts[0] === 'agent' && parts[1]) {
    return `Agent ${parts[1]} Conversation terminée`
  }
  return 'Conversation terminée'
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

  const completionTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const notifiedSignatureRef = useRef<Record<string, string>>({})
  const pendingSessionsRef = useRef<Record<string, PendingSession>>({})

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications))
  }, [notifications])

  const addNotification = useCallback((notification: AppNotification) => {
    setNotifications(prev => {
      if (prev.some(item => item.id === notification.id)) return prev
      return [notification, ...prev].slice(0, 30)
    })
  }, [])

  const openSessionNotification = useCallback((id: string) => {
    setNotifications(prev => prev.map(item => (
      item.id === id ? { ...item, read: true } : item
    )))
    const target = notifications.find(item => item.id === id)
    if (target) {
      navigate(`/chat?session=${encodeURIComponent(target.sessionKey)}`)
    }
  }, [navigate, notifications])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(item => ({ ...item, read: true })))
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(item => item.id !== id))
  }, [])

  const clearPendingSession = useCallback((sessionKey: string) => {
    delete pendingSessionsRef.current[normalizeSessionKey(sessionKey)]
  }, [])

  const registerPendingSession = useCallback((sessionKey: string, baselineAssistantCount: number) => {
    pendingSessionsRef.current[normalizeSessionKey(sessionKey)] = {
      sessionKey,
      baselineAssistantCount,
      startedAt: new Date().toISOString(),
    }
  }, [])

  useEffect(() => {
    const currentSession = getCurrentChatSession(location)
    if (!currentSession) return
    setNotifications(prev => prev.map(item => (
      normalizeSessionKey(item.sessionKey) === normalizeSessionKey(currentSession)
        ? { ...item, read: true }
        : item
    )))
  }, [location])

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return

    const sse = new EventSource(`/api/openclaw/events/stream?token=${encodeURIComponent(token)}`)

    const handleFinal = async (rawSessionKey: string) => {
      const sessionKey = await resolveSessionKey(rawSessionKey)
      if (!sessionKey) return

      const currentSession = getCurrentChatSession(location)
      if (currentSession && normalizeSessionKey(currentSession) === normalizeSessionKey(sessionKey)) {
        clearPendingSession(sessionKey)
        return
      }

      getSession(sessionKey).then(detail => {
        const assistantMessages = (detail.messages || []).filter(msg => msg.role === 'assistant')
        const lastAssistant = assistantMessages.at(-1)
        if (!lastAssistant) return

        const signature = `${lastAssistant.timestamp || ''}:${lastAssistant.content}`
        if (notifiedSignatureRef.current[sessionKey] === signature) return
        notifiedSignatureRef.current[sessionKey] = signature

        addNotification({
          id: `${sessionKey}:${lastAssistant.timestamp || Date.now()}`,
          sessionKey,
          title: titleFromSessionKey(sessionKey),
          preview: summarize(lastAssistant.content),
          createdAt: new Date().toISOString(),
          read: false,
        })
        clearPendingSession(sessionKey)
      }).catch(() => {
        // ignore notification fetch failures
      })
    }

    sse.onmessage = evt => {
      try {
        const msg = JSON.parse(evt.data)
        if (msg.event !== 'chat' || !msg.payload?.sessionKey) return

        const sessionKey = String(msg.payload.sessionKey)
        if (msg.payload.state === 'started') {
          const timer = completionTimersRef.current[sessionKey]
          if (timer) clearTimeout(timer)
          return
        }

        if (msg.payload.state === 'final') {
          const timer = completionTimersRef.current[sessionKey]
          if (timer) clearTimeout(timer)
          completionTimersRef.current[sessionKey] = setTimeout(() => {
            void handleFinal(sessionKey)
          }, 3000)
        }
      } catch {
        // ignore malformed events
      }
    }

    sse.onerror = () => {
      // SSE connections can close during page refresh, navigation, or transient
      // network issues - do NOT logout on error. The browser's EventSource will
      // auto-reconnect when readyState is CONNECTING. If the token is truly
      // invalid, the next API call will get a 401 and handle logout there.
    }

    return () => {
      Object.values(completionTimersRef.current).forEach(timer => clearTimeout(timer))
      completionTimersRef.current = {}
      sse.close()
    }
  }, [addNotification, clearPendingSession, location])

  useEffect(() => {
    const interval = setInterval(() => {
      const entries = Object.values(pendingSessionsRef.current)
      if (entries.length === 0) return

      entries.forEach(pending => {
        void getSession(pending.sessionKey).then(detail => {
          const assistantMessages = (detail.messages || []).filter(msg => msg.role === 'assistant')
          if (assistantMessages.length <= pending.baselineAssistantCount) return

          const currentSession = getCurrentChatSession(location)
          if (currentSession && normalizeSessionKey(currentSession) === normalizeSessionKey(pending.sessionKey)) {
            clearPendingSession(pending.sessionKey)
            return
          }

          const lastAssistant = assistantMessages.at(-1)
          if (!lastAssistant) return

          const signature = `${lastAssistant.timestamp || ''}:${lastAssistant.content}`
          if (notifiedSignatureRef.current[pending.sessionKey] === signature) {
            clearPendingSession(pending.sessionKey)
            return
          }
          notifiedSignatureRef.current[pending.sessionKey] = signature

          addNotification({
            id: `${pending.sessionKey}:${lastAssistant.timestamp || Date.now()}`,
            sessionKey: pending.sessionKey,
            title: titleFromSessionKey(pending.sessionKey),
            preview: summarize(lastAssistant.content),
            createdAt: new Date().toISOString(),
            read: false,
          })
          clearPendingSession(pending.sessionKey)
        }).catch(() => {
          // keep pending and retry
        })
      })
    }, 4000)

    return () => clearInterval(interval)
  }, [addNotification, clearPendingSession, location])

  const value = useMemo<NotificationContextValue>(() => ({
    notifications,
    unreadCount: notifications.filter(item => !item.read).length,
    openSessionNotification,
    markAllAsRead,
    removeNotification,
    registerPendingSession,
    clearPendingSession,
  }), [
    clearPendingSession,
    markAllAsRead,
    notifications,
    openSessionNotification,
    registerPendingSession,
    removeNotification,
  ])

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}
