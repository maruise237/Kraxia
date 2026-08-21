import { useState } from 'react'
import { Bell, CheckCheck, X } from 'lucide-react'
import { useNotifications } from './NotificationProvider'

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.max(1, Math.floor(diffMs / 60000))
  if (minutes < 60) return `${minutes} `
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} `
  const days = Math.floor(hours / 24)
  return `${days} jours`
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, openSessionNotification, markAllAsRead, removeNotification } = useNotifications()

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="relative text-dark-text-secondary hover:text-dark-text"
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-red px-1 text-[10px] text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 w-96 overflow-hidden rounded-xl border border-dark-border bg-dark-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-dark-border px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-dark-text">Notifications</div>
              <div className="text-xs text-dark-text-secondary">Vos conversations terminées apparaîtront ici</div>
            </div>
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1 text-xs text-accent-blue hover:opacity-80"
            >
              <CheckCheck size={14} />
              Tout marquer comme lu
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-dark-text-secondary">
                Notifications
              </div>
            ) : (
              notifications.map(item => (
                <div
                  key={item.id}
                  className={`border-b border-dark-border/60 px-4 py-3 ${
                    item.read ? 'bg-dark-card' : 'bg-accent-blue/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => {
                        openSessionNotification(item.id)
                        setOpen(false)
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        {!item.read && <span className="h-2 w-2 rounded-full bg-accent-blue" />}
                        <span className="truncate text-sm font-medium text-dark-text">{item.title}</span>
                      </div>
                      <div className="mt-1 line-clamp-2 text-sm text-dark-text-secondary">
                        {item.preview}
                      </div>
                      <div className="mt-2 text-xs text-dark-text-secondary">
                        {formatRelativeTime(item.createdAt)}
                      </div>
                    </button>
                    <button
                      onClick={() => removeNotification(item.id)}
                      className="shrink-0 text-dark-text-secondary hover:text-dark-text"
                      title="SupprimerNotifications"
                    >
                      <X size={14} />
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
