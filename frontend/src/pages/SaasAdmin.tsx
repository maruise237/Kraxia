import { useState, useEffect, useCallback } from 'react'
import {
  LayoutDashboard,
  Users,
  Container as ContainerIcon,
  ShieldAlert,
  Activity,
  Loader2,
  RefreshCw,
  Search,
  Edit3,
  KeyRound,
  RotateCcw,
  PauseCircle,
  PlayCircle,
  Trash2,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { getAccessToken, fetchJSON } from '../lib/api'
import { fr as i18n } from '../lib/i18n'

interface DashboardStats {
  total_users: number
  active_users: number
  admin_users: number
  total_containers: number
  running_containers: number
  tokens_today: number
  tokens_this_month: number
  signups_7d: number
  top_models: Array<{ model: string; tokens: number; calls: number }>
}

interface ContainerSummary {
  id: string
  docker_id?: string | null
  status: string
  internal_host?: string | null
  internal_port?: number | null
  created_at?: string | null
}

interface AdminUser {
  id: string
  username: string
  email: string
  role: string
  quota_tier: string
  runtime_mode: string
  is_active: boolean
  created_at?: string | null
  last_active_at?: string | null
  container?: ContainerSummary | null
  tokens_today: number
  tokens_total: number
}

interface PaginatedUsers {
  items: AdminUser[]
  total: number
  page: number
  page_size: number
}

interface AuditRow {
  id: string
  actor_id?: string | null
  action: string
  target_id?: string | null
  details?: Record<string, unknown> | null
  created_at?: string | null
}

interface UsageDay {
  day: string
  tokens: number
  calls: number
}
interface UsageModel {
  model: string
  tokens: number
  calls: number
}

type Tab = 'dashboard' | 'users' | 'containers' | 'audit' | 'usage'


async function adminGet<T>(path: string): Promise<T> {
  const token = getAccessToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`/api/admin-saas${path}`, { headers })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Erreur ${res.status}`)
  }
  return res.json() as Promise<T>
}

async function adminPost<T>(path: string, body: unknown = {}): Promise<T> {
  const token = getAccessToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`/api/admin-saas${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Erreur ${res.status}`)
  }
  return res.json() as Promise<T>
}

async function adminPatch<T>(path: string, body: unknown): Promise<T> {
  const token = getAccessToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`/api/admin-saas${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Erreur ${res.status}`)
  }
  return res.json() as Promise<T>
}


export default function SaasAdmin() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const flash = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3500)
  }

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text">
      <header className="border-b border-dark-border bg-dark-sidebar">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-purple text-sm font-bold text-white">KX</div>
            <div>
              <div className="text-base font-semibold">{i18n.adminPanel.title}</div>
              <div className="text-xs text-dark-text-secondary">{i18n.adminPanel.subtitle}</div>
            </div>
          </div>
          <button onClick={() => { logout() }} className="text-xs text-dark-text-secondary hover:text-accent-red">
            Quitter
          </button>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 px-6 pb-3">
          {([
            ['dashboard', LayoutDashboard, i18n.adminPanel.tabs.dashboard],
            ['users', Users, i18n.adminPanel.tabs.users],
            ['containers', ContainerIcon, i18n.adminPanel.tabs.containers],
            ['audit', ShieldAlert, i18n.adminPanel.tabs.audit],
            ['usage', Activity, i18n.adminPanel.tabs.usage],
          ] as Array<[Tab, typeof Users, string]>).map(([id, Icon, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors ${
                tab === id
                  ? 'bg-accent-purple/15 text-accent-purple'
                  : 'text-dark-text-secondary hover:bg-dark-card hover:text-dark-text'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </nav>
      </header>

      {error && (
        <div className="mx-auto mt-4 max-w-7xl rounded-lg bg-accent-red/10 px-4 py-2 text-sm text-accent-red flex items-center gap-2">
          <AlertCircle size={14} /> {error}
          <button className="ml-auto" onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}
      {success && (
        <div className="mx-auto mt-4 max-w-7xl rounded-lg bg-accent-green/10 px-4 py-2 text-sm text-accent-green flex items-center gap-2">
          <CheckCircle2 size={14} /> {success}
        </div>
      )}

      <main className="mx-auto max-w-7xl px-6 py-6">
        {tab === 'dashboard' && <DashboardTab onError={setError} />}
        {tab === 'users' && <UsersTab onError={setError} onSuccess={flash} />}
        {tab === 'containers' && <ContainersTab onError={setError} />}
        {tab === 'audit' && <AuditTab onError={setError} />}
        {tab === 'usage' && <UsageTab onError={setError} />}
      </main>
    </div>
  )
}


function DashboardTab({ onError }: { onError: (s: string) => void }) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminGet<DashboardStats>('/dashboard')
      setStats(data)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [onError])

  useEffect(() => { load() }, [load])

  if (loading || !stats) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent-purple" size={32} /></div>
  }

  const tiles = [
    { label: i18n.adminPanel.dashboard.totalUsers, value: stats.total_users, color: 'bg-accent-blue' },
    { label: i18n.adminPanel.dashboard.activeUsers, value: stats.active_users, color: 'bg-accent-green' },
    { label: i18n.adminPanel.dashboard.adminUsers, value: stats.admin_users, color: 'bg-accent-purple' },
    { label: i18n.adminPanel.dashboard.containersRunning, value: `${stats.running_containers}/${stats.total_containers}`, color: 'bg-accent-yellow' },
    { label: i18n.adminPanel.dashboard.tokensToday, value: stats.tokens_today.toLocaleString('fr-FR'), color: 'bg-accent-purple' },
    { label: i18n.adminPanel.dashboard.tokensThisMonth, value: stats.tokens_this_month.toLocaleString('fr-FR'), color: 'bg-accent-blue' },
    { label: 'Inscriptions 7j', value: stats.signups_7d, color: 'bg-accent-green' },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold">{i18n.adminPanel.tabs.dashboard}</h2>
        <button onClick={load} className="flex items-center gap-1.5 rounded-lg border border-dark-border px-3 py-1.5 text-xs text-dark-text-secondary hover:text-dark-text">
          <RefreshCw size={14} /> {i18n.common.refresh}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-dark-border bg-dark-card p-4">
            <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${t.color} text-white`}>
              <LayoutDashboard size={16} />
            </div>
            <div className="text-2xl font-bold">{t.value}</div>
            <div className="text-xs text-dark-text-secondary">{t.label}</div>
          </div>
        ))}
      </div>

      {stats.top_models.length > 0 && (
        <section className="mt-8">
          <h3 className="mb-3 text-base font-semibold">{i18n.adminPanel.usage.topModels}</h3>
          <div className="rounded-xl border border-dark-border bg-dark-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-dark-text-secondary">
                  <th className="px-5 py-3 font-medium">{i18n.adminPanel.usage.modelName}</th>
                  <th className="px-4 py-3 font-medium">{i18n.adminPanel.usage.usageCount}</th>
                  <th className="px-4 py-3 font-medium">{i18n.adminPanel.usage.totalTokens}</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_models.map((m) => (
                  <tr key={m.model} className="border-t border-dark-border/50">
                    <td className="px-5 py-3 font-mono text-xs">{m.model}</td>
                    <td className="px-4 py-3">{m.calls}</td>
                    <td className="px-4 py-3 font-mono text-xs">{m.tokens.toLocaleString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}


function UsersTab({ onError, onSuccess }: { onError: (s: string) => void; onSuccess: (s: string) => void }) {
  const [data, setData] = useState<PaginatedUsers | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [resetting, setResetting] = useState<AdminUser | null>(null)
  const [newPwd, setNewPwd] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), page_size: '25' })
      if (search) params.set('q', search)
      const d = await adminGet<PaginatedUsers>(`/users?${params.toString()}`)
      setData(d)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [page, search, onError])

  useEffect(() => { load() }, [load])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1

  const actor = async (userId: string, op: () => Promise<unknown>, ok = 'Action effectuee') => {
    setBusy(userId)
    try {
      await op()
      onSuccess(ok)
      load()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Action echouee')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{i18n.adminPanel.users.title}</h2>
        <div className="flex items-center gap-2 rounded-lg bg-dark-card px-3 py-1.5">
          <Search size={14} className="text-dark-text-secondary" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder={i18n.adminPanel.users.search}
            className="bg-transparent text-sm text-dark-text outline-none placeholder:text-dark-text-secondary"
          />
        </div>
        <button onClick={load} className="flex items-center gap-1.5 rounded-lg border border-dark-border px-3 py-1.5 text-xs text-dark-text-secondary hover:text-dark-text">
          <RefreshCw size={14} /> {i18n.common.refresh}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-dark-border bg-dark-card">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-accent-purple" size={24} /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-dark-text-secondary">
              <tr>
                <th className="px-5 py-3 font-medium">{i18n.adminPanel.users.username}</th>
                <th className="px-4 py-3 font-medium">{i18n.adminPanel.users.email}</th>
                <th className="px-4 py-3 font-medium">{i18n.adminPanel.users.role}</th>
                <th className="px-4 py-3 font-medium">{i18n.adminPanel.users.quota}</th>
                <th className="px-4 py-3 font-medium">{i18n.adminPanel.users.status}</th>
                <th className="px-4 py-3 font-medium">{i18n.adminPanel.users.container}</th>
                <th className="px-4 py-3 font-medium">{i18n.adminPanel.users.tokensToday}</th>
                <th className="px-4 py-3 font-medium text-center">{i18n.adminPanel.users.actions}</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((u) => (
                <tr key={u.id} className="border-t border-dark-border/50">
                  <td className="px-5 py-3 font-medium">{u.username}</td>
                  <td className="px-4 py-3 text-dark-text-secondary">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${u.role === 'admin' ? 'bg-accent-purple/15 text-accent-purple' : 'bg-dark-bg text-dark-text-secondary'}`}>
                      {u.role === 'admin' ? i18n.adminPanel.users.roleAdmin : i18n.adminPanel.users.roleUser}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {u.quota_tier === 'free' ? i18n.adminPanel.users.quotaFree : u.quota_tier === 'basic' ? i18n.adminPanel.users.quotaBasic : i18n.adminPanel.users.quotaPro}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${u.is_active ? 'bg-accent-green/15 text-accent-green' : 'bg-accent-red/15 text-accent-red'}`}>
                      {u.is_active ? i18n.adminPanel.users.active : i18n.adminPanel.users.inactive}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-dark-text-secondary">
                    {u.container?.status ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono">{u.tokens_today.toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setEditing(u)} title={i18n.adminPanel.users.edit} className="rounded p-1 text-dark-text-secondary hover:bg-dark-bg hover:text-accent-blue">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => { setResetting(u); setNewPwd('') }} title={i18n.adminPanel.users.resetPassword} className="rounded p-1 text-dark-text-secondary hover:bg-dark-bg hover:text-accent-purple">
                        <KeyRound size={14} />
                      </button>
                      {u.container && (
                        <>
                          <button
                            disabled={busy === u.id}
                            onClick={() => actor(u.id, () => adminPost(`/users/${u.id}/container/restart`), i18n.adminPanel.errors.containerRestarted)}
                            title={i18n.adminPanel.users.restartContainer}
                            className="rounded p-1 text-dark-text-secondary hover:bg-dark-bg hover:text-accent-yellow disabled:opacity-40"
                          >
                            <RotateCcw size={14} />
                          </button>
                          <button
                            disabled={busy === u.id}
                            onClick={() => actor(u.id, () => adminPost(`/users/${u.id}/container/pause`), i18n.adminPanel.errors.containerPaused)}
                            title={i18n.adminPanel.users.pause}
                            className="rounded p-1 text-dark-text-secondary hover:bg-dark-bg hover:text-accent-yellow disabled:opacity-40"
                          >
                            <PauseCircle size={14} />
                          </button>
                          <button
                            disabled={busy === u.id}
                            onClick={() => actor(u.id, () => adminPost(`/users/${u.id}/container/destroy`), i18n.adminPanel.errors.containerDestroyed)}
                            title={i18n.adminPanel.users.destroy}
                            className="rounded p-1 text-dark-text-secondary hover:bg-dark-bg hover:text-accent-red disabled:opacity-40"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && data?.items.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-sm text-dark-text-secondary">{i18n.adminPanel.users.noUsers}</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {data && data.total > data.page_size && (
        <div className="mt-4 flex items-center justify-between text-xs text-dark-text-secondary">
          <span>{`Page ${data.page} / ${totalPages} - ${data.total} ${i18n.adminPanel.users.username.toLowerCase()}s`}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded border border-dark-border px-3 py-1 disabled:opacity-40 hover:text-dark-text">
              {i18n.adminPanel.users.prevPage}
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded border border-dark-border px-3 py-1 disabled:opacity-40 hover:text-dark-text">
              {i18n.adminPanel.users.nextPage}
            </button>
          </div>
        </div>
      )}

      {editing && <EditUserModal user={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); onSuccess(i18n.adminPanel.errors.savedSuccess) }} onError={onError} />}
      {resetting && <ResetPwdModal user={resetting} newPwd={newPwd} setNewPwd={setNewPwd} onClose={() => setResetting(null)} onSubmit={async () => {
        try { await adminPost(`/users/${resetting.id}/reset-password`, { new_password: newPwd }); onSuccess(i18n.adminPanel.errors.passwordResetSent); setResetting(null); }
        catch (e) { onError(e instanceof Error ? e.message : 'Erreur') }
      }} />}
    </div>
  )
}

function EditUserModal({ user, onClose, onSaved, onError }: { user: AdminUser; onClose: () => void; onSaved: () => void; onError: (s: string) => void }) {
  const [role, setRole] = useState(user.role)
  const [quota, setQuota] = useState(user.quota_tier)
  const [runtime, setRuntime] = useState(user.runtime_mode)
  const [active, setActive] = useState(user.is_active)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await adminPatch(`/users/${user.id}`, { role, quota_tier: quota, runtime_mode: runtime, is_active: active })
      onSaved()
    } catch (err) { onError(err instanceof Error ? err.message : 'Erreur') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-xl border border-dark-border bg-dark-sidebar p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">{i18n.adminPanel.users.edit} - {user.username}</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-dark-text-secondary">{i18n.adminPanel.users.role}</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-lg border border-dark-border bg-dark-bg px-3 py-2 text-sm">
              <option value="user">{i18n.adminPanel.users.roleUser}</option>
              <option value="admin">{i18n.adminPanel.users.roleAdmin}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-dark-text-secondary">{i18n.adminPanel.users.quota}</label>
            <select value={quota} onChange={(e) => setQuota(e.target.value)} className="w-full rounded-lg border border-dark-border bg-dark-bg px-3 py-2 text-sm">
              <option value="free">{i18n.adminPanel.users.quotaFree}</option>
              <option value="basic">{i18n.adminPanel.users.quotaBasic}</option>
              <option value="pro">{i18n.adminPanel.users.quotaPro}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-dark-text-secondary">{i18n.adminPanel.users.runtime}</label>
            <select value={runtime} onChange={(e) => setRuntime(e.target.value)} className="w-full rounded-lg border border-dark-border bg-dark-bg px-3 py-2 text-sm">
              <option value="dedicated">{i18n.adminPanel.users.runtimeDedicated}</option>
              <option value="shared">{i18n.adminPanel.users.runtimeShared}</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            {i18n.adminPanel.users.active}
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-dark-border px-4 py-2 text-xs">{i18n.adminPanel.users.cancel}</button>
          <button onClick={save} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-accent-blue px-4 py-2 text-xs text-white disabled:opacity-50">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} {i18n.adminPanel.users.save}
          </button>
        </div>
      </div>
    </div>
  )
}

function ResetPwdModal({ user, newPwd, setNewPwd, onClose, onSubmit }: { user: AdminUser; newPwd: string; setNewPwd: (s: string) => void; onClose: () => void; onSubmit: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-xl border border-dark-border bg-dark-sidebar p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">{i18n.adminPanel.users.resetPassword} - {user.username}</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <p className="mb-3 text-xs text-dark-text-secondary">
          {i18n.adminPanel.users.confirmReset}
        </p>
        <input
          type="password"
          value={newPwd}
          onChange={(e) => setNewPwd(e.target.value)}
          placeholder={i18n.adminPanel.users.newPassword}
          className="w-full rounded-lg border border-dark-border bg-dark-bg px-3 py-2 text-sm"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-dark-border px-4 py-2 text-xs">{i18n.adminPanel.users.cancel}</button>
          <button onClick={onSubmit} disabled={newPwd.length < 6} className="flex items-center gap-1.5 rounded-lg bg-accent-purple px-4 py-2 text-xs text-white disabled:opacity-50">
            <KeyRound size={12} /> {i18n.adminPanel.users.resetPassword}
          </button>
        </div>
      </div>
    </div>
  )
}


function ContainersTab({ onError }: { onError: (s: string) => void }) {
  const [data, setData] = useState<PaginatedUsers | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setData(await adminGet<PaginatedUsers>('/users?page_size=200')) }
    catch (err) { onError(err instanceof Error ? err.message : 'Erreur') }
    finally { setLoading(false) }
  }, [onError])

  useEffect(() => { load() }, [load])

  const rows = (data?.items ?? []).filter((u) => u.container)

  const actor = async (userId: string, op: () => Promise<unknown>, ok: string) => {
    setBusy(userId)
    try { await op(); onError('') }
    catch (err) { onError(err instanceof Error ? err.message : 'Action echouee') }
    finally { setBusy(null); load() }
    void ok
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">{i18n.adminPanel.containers.title}</h2>
        <button onClick={load} className="flex items-center gap-1.5 rounded-lg border border-dark-border px-3 py-1.5 text-xs text-dark-text-secondary hover:text-dark-text">
          <RefreshCw size={14} /> {i18n.common.refresh}
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-dark-border bg-dark-card">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-accent-purple" size={24} /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-dark-text-secondary">
              <tr>
                <th className="px-5 py-3 font-medium">{i18n.adminPanel.containers.user}</th>
                <th className="px-4 py-3 font-medium">{i18n.adminPanel.containers.dockerId}</th>
                <th className="px-4 py-3 font-medium">{i18n.adminPanel.containers.status}</th>
                <th className="px-4 py-3 font-medium">{i18n.adminPanel.containers.port}</th>
                <th className="px-4 py-3 font-medium">{i18n.adminPanel.containers.created}</th>
                <th className="px-4 py-3 font-medium text-center">{i18n.adminPanel.containers.actions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-t border-dark-border/50">
                  <td className="px-5 py-3 font-medium">{u.username}</td>
                  <td className="px-4 py-3 font-mono text-xs">{u.container?.docker_id?.slice(0, 12) ?? '-'}</td>
                  <td className="px-4 py-3 text-xs">{u.container?.status}</td>
                  <td className="px-4 py-3 text-xs">{u.container?.internal_port ?? '-'}</td>
                  <td className="px-4 py-3 text-xs text-dark-text-secondary">{u.container?.created_at?.slice(0, 16) ?? '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <button disabled={busy === u.id} onClick={() => actor(u.id, () => adminPost(`/users/${u.id}/container/restart`), 'OK')} className="rounded p-1 text-dark-text-secondary hover:text-accent-yellow">
                        <RotateCcw size={14} />
                      </button>
                      <button disabled={busy === u.id} onClick={() => actor(u.id, () => adminPost(`/users/${u.id}/container/destroy`), 'OK')} className="rounded p-1 text-dark-text-secondary hover:text-accent-red">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-sm text-dark-text-secondary">Aucun conteneur</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}


function AuditTab({ onError }: { onError: (s: string) => void }) {
  const [items, setItems] = useState<AuditRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await adminGet<{ items: AuditRow[]; total: number }>('/audit-log?limit=200')
      setItems(d.items); setTotal(d.total)
    } catch (err) { onError(err instanceof Error ? err.message : 'Erreur') }
    finally { setLoading(false) }
  }, [onError])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">{i18n.adminPanel.auditLog.title} <span className="text-xs text-dark-text-secondary">({total})</span></h2>
        <button onClick={load} className="flex items-center gap-1.5 rounded-lg border border-dark-border px-3 py-1.5 text-xs text-dark-text-secondary hover:text-dark-text">
          <RefreshCw size={14} /> {i18n.adminPanel.auditLog.refresh}
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-dark-border bg-dark-card">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-accent-purple" size={24} /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-dark-text-secondary">
              <tr>
                <th className="px-5 py-3 font-medium">{i18n.adminPanel.auditLog.timestamp}</th>
                <th className="px-4 py-3 font-medium">{i18n.adminPanel.auditLog.action}</th>
                <th className="px-4 py-3 font-medium">{i18n.adminPanel.auditLog.actor}</th>
                <th className="px-4 py-3 font-medium">{i18n.adminPanel.auditLog.target}</th>
                <th className="px-4 py-3 font-medium">{i18n.adminPanel.auditLog.details}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-t border-dark-border/50 align-top">
                  <td className="whitespace-nowrap px-5 py-3 text-xs text-dark-text-secondary">{row.created_at?.replace('T', ' ').slice(0, 19) ?? '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.action}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.actor_id ?? '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.target_id ?? '-'}</td>
                  <td className="px-4 py-3 text-xs text-dark-text-secondary">
                    <code className="break-all">{row.details ? JSON.stringify(row.details) : '-'}</code>
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-sm text-dark-text-secondary">Aucun evenement</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}


function UsageTab({ onError }: { onError: (s: string) => void }) {
  const [days, setDays] = useState(30)
  const [perDay, setPerDay] = useState<UsageDay[]>([])
  const [perModel, setPerModel] = useState<UsageModel[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (d: number) => {
    setLoading(true)
    try {
      const r = await adminGet<{ per_day: UsageDay[]; per_model: UsageModel[] }>(`/usage/stats?days=${d}`)
      setPerDay(r.per_day); setPerModel(r.per_model)
    } catch (err) { onError(err instanceof Error ? err.message : 'Erreur') }
    finally { setLoading(false) }
  }, [onError])

  useEffect(() => { load(days) }, [days, load])

  const totalTokens = perDay.reduce((s, d) => s + d.tokens, 0)
  const totalCalls = perDay.reduce((s, d) => s + d.calls, 0)
  const maxTokens = Math.max(1, ...perDay.map((d) => d.tokens))

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">{i18n.adminPanel.usage.title}</h2>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-lg border border-dark-border bg-dark-card px-3 py-1.5 text-xs text-dark-text">
          <option value={7}>{i18n.adminPanel.usage.days7}</option>
          <option value={30}>{i18n.adminPanel.usage.days30}</option>
          <option value={90}>{i18n.adminPanel.usage.days90}</option>
        </select>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-dark-border bg-dark-card p-4">
          <div className="text-xs text-dark-text-secondary">{i18n.adminPanel.usage.totalTokens}</div>
          <div className="text-2xl font-bold">{totalTokens.toLocaleString('fr-FR')}</div>
        </div>
        <div className="rounded-xl border border-dark-border bg-dark-card p-4">
          <div className="text-xs text-dark-text-secondary">Appels</div>
          <div className="text-2xl font-bold">{totalCalls.toLocaleString('fr-FR')}</div>
        </div>
      </div>

      <section className="rounded-xl border border-dark-border bg-dark-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-dark-text">{i18n.adminPanel.usage.perDay}</h3>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-accent-purple" size={20} /></div>
        ) : perDay.length === 0 ? (
          <p className="py-8 text-center text-sm text-dark-text-secondary">Aucune donnee sur la periode.</p>
        ) : (
          <div className="flex h-32 items-end gap-1">
            {perDay.map((d) => {
              const h = (d.tokens / maxTokens) * 100
              return (
                <div key={d.day} className="group relative flex flex-1 flex-col items-center">
                  <div className="w-full rounded-t bg-gradient-to-t from-accent-purple to-accent-blue" style={{ height: `${Math.max(2, h)}%` }} />
                  <div className="absolute bottom-full mb-1 hidden whitespace-nowrap rounded bg-dark-sidebar px-2 py-1 text-xs text-dark-text group-hover:block">
                    {d.day} - {d.tokens.toLocaleString('fr-FR')} jetons
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-dark-border bg-dark-card">
        <h3 className="px-5 py-3 text-sm font-semibold text-dark-text">{i18n.adminPanel.usage.topModels}</h3>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-dark-text-secondary">
            <tr>
              <th className="px-5 py-3 font-medium">{i18n.adminPanel.usage.modelName}</th>
              <th className="px-4 py-3 font-medium">{i18n.adminPanel.usage.usageCount}</th>
              <th className="px-4 py-3 font-medium">{i18n.adminPanel.usage.totalTokens}</th>
            </tr>
          </thead>
          <tbody>
            {perModel.slice(0, 15).map((m) => (
              <tr key={m.model} className="border-t border-dark-border/50">
                <td className="px-5 py-3 font-mono text-xs">{m.model}</td>
                <td className="px-4 py-3">{m.calls}</td>
                <td className="px-4 py-3 font-mono text-xs">{m.tokens.toLocaleString('fr-FR')}</td>
              </tr>
            ))}
            {!loading && perModel.length === 0 && (
              <tr><td colSpan={3} className="py-8 text-center text-sm text-dark-text-secondary">Aucun modele utilise</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}


function logout() {
  localStorage.removeItem('openclaw_access_token')
  localStorage.removeItem('openclaw_refresh_token')
  localStorage.removeItem('kraxia_access_token')
  localStorage.removeItem('kraxia_refresh_token')
  window.location.href = '/login'
}
