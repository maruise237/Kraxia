import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Trash2,
  Play,
  RefreshCw,
  Loader2,
  AlertCircle,
  Clock,
  ToggleLeft,
  ToggleRight,
  X,
} from 'lucide-react'
import type { CronJob } from '../lib/api'
import {
  listCronJobs,
  createCronJob,
  deleteCronJob,
  toggleCronJob,
  runCronJob,
} from '../lib/api'

export default function CronJobs() {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CronJob | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchJobs = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true)
    setError('')
    try {
      const result = await listCronJobs(true)
      setJobs(result)
    } catch (err: any) {
      setError(err?.message || 'Tâches planifiées')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs(true)
  }, [fetchJobs])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchJobs()
  }

  const handleToggle = async (job: CronJob) => {
    setTogglingId(job.id)
    try {
      const updated = await toggleCronJob(job.id, !job.enabled)
      setJobs((prev) => prev.map((j) => (j.id === job.id ? updated : j)))
    } catch (err: any) {
      setError(err?.message || 'Échec du basculement')
    } finally {
      setTogglingId(null)
    }
  }

  const handleRun = async (job: CronJob) => {
    setRunningId(job.id)
    try {
      await runCronJob(job.id)
      // Refresh to get updated last_run info
      await fetchJobs()
    } catch (err: any) {
      setError(err?.message || 'Échec de l'exécution')
    } finally {
      setRunningId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteCronJob(deleteTarget.id)
      setJobs((prev) => prev.filter((j) => j.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err: any) {
      setError(err?.message || 'Supprimer')
    } finally {
      setDeleting(false)
    }
  }

  const handleCreated = (job: CronJob) => {
    setJobs((prev) => [...prev, job])
    setShowCreate(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-accent-blue" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-text">Tâches planifiées</h1>
          <p className="mt-1 text-sm text-dark-text-secondary">
            Gestion agent 
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-dark-border px-3 py-1.5 text-xs text-dark-text-secondary hover:text-dark-text transition-colors"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Actualiser
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-lg bg-accent-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-blue/90 transition-colors"
          >
            <Plus size={14} />
            Nouvelle
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-accent-red/10 p-3 text-sm text-accent-red flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-accent-red/70 hover:text-accent-red">
            <X size={14} />
          </button>
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-dark-border bg-dark-card px-4 py-16 text-center">
          <Clock size={40} className="mx-auto mb-3 text-dark-text-secondary/50" />
          <p className="text-sm text-dark-text-secondary mb-3">Tâches planifiées</p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-blue px-4 py-2 text-sm font-medium text-white hover:bg-accent-blue/90 transition-colors"
          >
            <Plus size={14} />
            Tâches planifiées
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-dark-border bg-dark-card overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_180px_140px_140px_120px] gap-2 border-b border-dark-border bg-dark-bg px-4 py-2 text-xs font-medium text-dark-text-secondary">
            <span>Nom de la tâche</span>
            <span>Planification</span>
            <span>Dernière exécution</span>
            <span>Prochaine exécution</span>
            <span className="text-right">Actions</span>
          </div>

          {jobs.map((job) => (
            <div key={job.id}>
              <div className="grid grid-cols-[1fr_180px_140px_140px_120px] gap-2 items-center border-b border-dark-border px-4 py-3 hover:bg-dark-bg/50 transition-colors">
                {/* Name + message */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium truncate ${job.enabled ? 'text-dark-text' : 'text-dark-text-secondary line-through'}`}>
                      {job.name || ''}
                    </span>
                    {!job.enabled && (
                      <span className="shrink-0 rounded bg-dark-bg px-1.5 py-0.5 text-[10px] text-dark-text-secondary">
                        Désactiver
                      </span>
                    )}
                    {job.last_status === 'error' && (
                      <span className="shrink-0 rounded bg-accent-red/10 px-1.5 py-0.5 text-[10px] text-accent-red">
                        
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-dark-text-secondary truncate mt-0.5" title={job.message}>
                    {job.message}
                  </p>
                  {job.last_error && (
                    <p className="text-[11px] text-accent-red truncate mt-0.5" title={job.last_error}>
                      {job.last_error}
                    </p>
                  )}
                </div>

                {/* Schedule */}
                <div className="text-xs text-dark-text-secondary truncate" title={job.schedule_display}>
                  {job.schedule_display || job.schedule_expr || formatEveryMs(job.schedule_every_ms)}
                </div>

                {/* Last run */}
                <div className="text-xs text-dark-text-secondary">
                  {job.last_run_at_ms ? formatTime(job.last_run_at_ms) : '-'}
                </div>

                {/* Next run */}
                <div className="text-xs text-dark-text-secondary">
                  {job.next_run_at_ms ? formatTime(job.next_run_at_ms) : '-'}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => handleToggle(job)}
                    disabled={togglingId === job.id}
                    className="rounded-lg p-1.5 text-dark-text-secondary hover:text-dark-text hover:bg-dark-bg transition-colors disabled:opacity-50"
                    title={job.enabled ? 'Désactiver' : 'Activer'}
                  >
                    {togglingId === job.id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : job.enabled ? (
                      <ToggleRight size={15} className="text-accent-green" />
                    ) : (
                      <ToggleLeft size={15} />
                    )}
                  </button>
                  <button
                    onClick={() => handleRun(job)}
                    disabled={runningId === job.id || !job.enabled}
                    className="rounded-lg p-1.5 text-dark-text-secondary hover:text-accent-blue hover:bg-accent-blue/10 transition-colors disabled:opacity-50"
                    title=""
                  >
                    {runningId === job.id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Play size={15} />
                    )}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(job)}
                    className="rounded-lg p-1.5 text-dark-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateCronModal
          onCreated={handleCreated}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-xl bg-dark-card border border-dark-border p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-base font-semibold text-dark-text mb-2">Supprimer</h3>
            <p className="text-sm text-dark-text-secondary mb-4">
              ConfirmerSupprimerTâches planifiées <span className="font-medium text-dark-text">{deleteTarget.name || deleteTarget.id}</span>？
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-dark-border px-4 py-1.5 text-sm text-dark-text-secondary hover:text-dark-text transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-accent-red px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-red/90 transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Create modal ---

type ScheduleType = 'every' | 'cron' | 'once'

function CreateCronModal({
  onCreated,
  onClose,
}: {
  onCreated: (job: CronJob) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [scheduleType, setScheduleType] = useState<ScheduleType>('every')
  const [everySeconds, setEverySeconds] = useState('3600')
  const [cronExpr, setCronExpr] = useState('')
  const [atIso, setAtIso] = useState('')
  const [deliver, setDeliver] = useState(false)
  const [channel, setChannel] = useState('')
  const [to, setTo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Nom de la tâche')
      return
    }
    if (!message.trim()) {
      setError('Message')
      return
    }

    setSaving(true)
    setError('')
    try {
      const params: Parameters<typeof createCronJob>[0] = {
        name: name.trim(),
        message: message.trim(),
      }

      if (scheduleType === 'every') {
        const secs = parseInt(everySeconds, 10)
        if (!secs || secs < 1) {
          setError(' 0')
          setSaving(false)
          return
        }
        params.every_seconds = secs
      } else if (scheduleType === 'cron') {
        if (!cronExpr.trim()) {
          setError(' Expression cron')
          setSaving(false)
          return
        }
        params.cron_expr = cronExpr.trim()
      } else {
        if (!atIso.trim()) {
          setError('')
          setSaving(false)
          return
        }
        params.at_iso = new Date(atIso).toISOString()
      }

      if (deliver) {
        params.deliver = true
        if (channel.trim()) params.channel = channel.trim()
        if (to.trim()) params.to = to.trim()
      }

      const job = await createCronJob(params)
      onCreated(job)
    } catch (err: any) {
      setError(err?.message || '')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="rounded-xl bg-dark-card border border-dark-border max-w-lg w-full mx-4 shadow-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border shrink-0">
          <h3 className="text-base font-semibold text-dark-text">NouvelleTâches planifiées</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-dark-text-secondary hover:text-dark-text transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-accent-red/10 p-2.5 text-xs text-accent-red flex items-center gap-2">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-dark-text-secondary mb-1">
              Nom de la tâche *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="："
              className="w-full rounded-lg border border-dark-border bg-dark-bg px-3 py-2 text-sm text-dark-text outline-none focus:border-accent-blue placeholder:text-dark-text-secondary"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-medium text-dark-text-secondary mb-1">
              Message *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Agent Message..."
              className="w-full rounded-lg border border-dark-border bg-dark-bg px-3 py-2 text-sm text-dark-text outline-none focus:border-accent-blue placeholder:text-dark-text-secondary resize-none"
            />
            <p className="mt-0.5 text-[11px] text-dark-text-secondary">
              ，MessageUtilisateur Agent
            </p>
          </div>

          {/* Schedule type */}
          <div>
            <label className="block text-xs font-medium text-dark-text-secondary mb-2">
              Planification
            </label>
            <div className="flex gap-2">
              {([
                ['every', 'Intervalle fixe'],
                ['cron', 'Expression cron'],
                ['once', 'Exécution unique'],
              ] as const).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => setScheduleType(type)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    scheduleType === type
                      ? 'bg-accent-blue text-white'
                      : 'border border-dark-border text-dark-text-secondary hover:text-dark-text'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule config */}
          {scheduleType === 'every' && (
            <div>
              <label className="block text-xs font-medium text-dark-text-secondary mb-1">
                （）
              </label>
              <input
                type="number"
                value={everySeconds}
                onChange={(e) => setEverySeconds(e.target.value)}
                min={1}
                placeholder="3600"
                className="w-full rounded-lg border border-dark-border bg-dark-bg px-3 py-2 text-sm text-dark-text outline-none focus:border-accent-blue placeholder:text-dark-text-secondary"
              />
              <p className="mt-0.5 text-[11px] text-dark-text-secondary">
                {formatEveryMs(parseInt(everySeconds, 10) * 1000 || null)}
              </p>
            </div>
          )}

          {scheduleType === 'cron' && (
            <div>
              <label className="block text-xs font-medium text-dark-text-secondary mb-1">
                Expression cron
              </label>
              <input
                type="text"
                value={cronExpr}
                onChange={(e) => setCronExpr(e.target.value)}
                placeholder="0 9 * * *"
                className="w-full rounded-lg border border-dark-border bg-dark-bg px-3 py-2 text-sm text-dark-text font-mono outline-none focus:border-accent-blue placeholder:text-dark-text-secondary"
              />
              <p className="mt-0.5 text-[11px] text-dark-text-secondary">
                ：    （：0 9 * * * jours 9:00）
              </p>
            </div>
          )}

          {scheduleType === 'once' && (
            <div>
              <label className="block text-xs font-medium text-dark-text-secondary mb-1">
                
              </label>
              <input
                type="datetime-local"
                value={atIso}
                onChange={(e) => setAtIso(e.target.value)}
                className="w-full rounded-lg border border-dark-border bg-dark-bg px-3 py-2 text-sm text-dark-text outline-none focus:border-accent-blue"
              />
            </div>
          )}

          {/* Deliver option */}
          <div className="border-t border-dark-border pt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={deliver}
                onChange={(e) => setDeliver(e.target.checked)}
                className="rounded border-dark-border"
              />
              <span className="text-sm text-dark-text"></span>
            </label>
            <p className="mt-0.5 ml-5 text-[11px] text-dark-text-secondary">
              ，Agent 
            </p>
          </div>

          {deliver && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-dark-text-secondary mb-1">
                  
                </label>
                <input
                  type="text"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  placeholder="telegram, discord..."
                  className="w-full rounded-lg border border-dark-border bg-dark-bg px-3 py-2 text-sm text-dark-text outline-none focus:border-accent-blue placeholder:text-dark-text-secondary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-text-secondary mb-1">
                  Cible
                </label>
                <input
                  type="text"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="UtilisateurIDID"
                  className="w-full rounded-lg border border-dark-border bg-dark-bg px-3 py-2 text-sm text-dark-text outline-none focus:border-accent-blue placeholder:text-dark-text-secondary"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-dark-border shrink-0">
          <button
            onClick={onClose}
            className="rounded-lg border border-dark-border px-4 py-1.5 text-sm text-dark-text-secondary hover:text-dark-text transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-accent-blue px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Helpers ---

function formatTime(ms: number): string {
  const d = new Date(ms)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (isToday) return `jours ${time}`
  const date = `${d.getMonth() + 1}/${d.getDate()}`
  return `${date} ${time}`
}

function formatEveryMs(ms: number | null): string {
  if (!ms || ms <= 0) return '-'
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return ` ${seconds} `
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return ` ${minutes} `
  const hours = Math.floor(minutes / 60)
  const remainMinutes = minutes % 60
  if (hours < 24) {
    return remainMinutes > 0 ? ` ${hours}  ${remainMinutes} ` : ` ${hours} `
  }
  const days = Math.floor(hours / 24)
  const remainHours = hours % 24
  return remainHours > 0 ? ` ${days} jours ${remainHours} ` : ` ${days} jours`
}
