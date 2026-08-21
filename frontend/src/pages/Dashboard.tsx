import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, Loader2, MessageSquare, Wrench } from 'lucide-react'
import { getAccessToken, listSessions } from '../lib/api'
import { fetchAgents, fetchDashboardStats } from '../store/agents'
import type { BackendAgent, DashboardStats } from '../types/agent'

type AgentStatus = 'running' | 'active' | 'idle'

const RECENT_ACTIVE_MS = 10 * 60 * 1000

function getAgentIdFromSessionKey(key: string): string {
  const parts = key.split(':')
  if (parts.length >= 2 && parts[0] === 'agent') return parts[1]
  return 'main'
}

function getStatusMeta(status: AgentStatus) {
  if (status === 'running') {
    return {
      label: 'En cours',
      className: 'border border-accent-blue/30 bg-accent-blue/10 text-accent-blue',
      dotClassName: 'bg-accent-blue',
    }
  }

  if (status === 'active') {
    return {
      label: 'Actif récemment',
      className: 'border border-accent-green/30 bg-accent-green/10 text-accent-green',
      dotClassName: 'bg-accent-green',
    }
  }

  return {
    label: 'Inactif',
    className: 'border border-dark-border bg-dark-bg text-dark-text-secondary',
    dotClassName: 'bg-dark-text-secondary/60',
  }
}

function StatCard({
  icon: Icon,
  iconColor,
  value,
  label,
}: {
  icon: React.ElementType
  iconColor: string
  value: string | number
  label: string
}) {
  return (
    <div className="rounded-xl border border-dark-border bg-dark-card p-5">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconColor}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
      <div className="mt-4 text-3xl font-bold text-dark-text">{value}</div>
      <div className="mt-1 text-sm text-dark-text-secondary">{label}</div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [agents, setAgents] = useState<BackendAgent[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalAgents: 0,
    totalSessions: 0,
    totalCompétences: 0,
  })
  const [loading, setLoading] = useState(true)
  const [runningAgents, setRunningAgents] = useState<Record<string, boolean>>({})
  const [recentlyActiveAgents, setRecentlyActiveAgents] = useState<Record<string, boolean>>({})

  useEffect(() => {
    Promise.all([fetchAgents(), fetchDashboardStats(), listSessions().catch(() => [])])
      .then(([agentList, dashboardStats, sessions]) => {
        setAgents(agentList)
        setStats(dashboardStats)

        const now = Date.now()
        const recentMap: Record<string, boolean> = {}
        sessions.forEach(session => {
          const agentId = getAgentIdFromSessionKey(session.key)
          const updatedAt = session.updated_at ? new Date(session.updated_at).getTime() : 0
          if (updatedAt && now - updatedAt <= RECENT_ACTIVE_MS) {
            recentMap[agentId] = true
          }
        })
        setRecentlyActiveAgents(recentMap)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return

    const sse = new EventSource(`/api/openclaw/events/stream?token=${encodeURIComponent(token)}`)

    sse.onmessage = evt => {
      try {
        const msg = JSON.parse(evt.data)
        if (msg.event !== 'chat' || !msg.payload?.sessionKey || !msg.payload?.state) return

        const sessionKey = String(msg.payload.sessionKey)
        const state = String(msg.payload.state)
        const agentId = getAgentIdFromSessionKey(sessionKey)

        if (state === 'started' || state === 'delta') {
          setRunningAgents(prev => ({ ...prev, [agentId]: true }))
          setRecentlyActiveAgents(prev => ({ ...prev, [agentId]: true }))
          return
        }

        if (state === 'final' || state === 'error' || state === 'aborted') {
          setRunningAgents(prev => ({ ...prev, [agentId]: false }))
          setRecentlyActiveAgents(prev => ({ ...prev, [agentId]: true }))
        }
      } catch {
        // ignore malformed events
      }
    }

    return () => {
      sse.close()
    }
  }, [])

  const agentStatuses = useMemo(() => {
    const statusMap: Record<string, AgentStatus> = {}
    agents.forEach(agent => {
      if (runningAgents[agent.id]) {
        statusMap[agent.id] = 'running'
      } else if (recentlyActiveAgents[agent.id]) {
        statusMap[agent.id] = 'active'
      } else {
        statusMap[agent.id] = 'idle'
      }
    })
    return statusMap
  }, [agents, recentlyActiveAgents, runningAgents])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-dark-text-secondary" size={32} />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark-text">Tableau de bord</h1>
        <p className="mt-1 text-sm text-dark-text-secondary">Vue d'ensemble des agents</p>
      </div>

      {/* Stat Cards */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <StatCard icon={Bot} iconColor="bg-accent-purple" value={stats.totalAgents} label="Nombre total d'agents" />
        <StatCard icon={MessageSquare} iconColor="bg-accent-blue" value={stats.totalSessions} label="Conversations" />
        <StatCard icon={Wrench} iconColor="bg-accent-green" value={stats.totalCompétences} label="Compétences" />
      </div>

      {/* agent Status Table */}
      <div className="rounded-xl border border-dark-border bg-dark-card">
        <div className="flex items-center justify-between border-b border-dark-border px-6 py-4">
          <div className="flex items-center gap-2">
            <Bot size={20} className="text-accent-blue" />
            <h2 className="text-base font-semibold text-dark-text">Aperçu des agents</h2>
          </div>
          <button
            onClick={() => navigate('/agents')}
            className="rounded-lg border border-dark-border px-3 py-1.5 text-xs text-dark-text-secondary hover:bg-dark-card-hover hover:text-dark-text transition-colors"
          >
            Tout afficher
          </button>
        </div>

        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-dark-text-secondary">
              <th className="px-6 py-3 font-medium">Nom de l'agent</th>
              <th className="px-4 py-3 font-medium">Identifiant</th>

              <th className="px-4 py-3 font-medium">État</th>
              <th className="px-4 py-3 font-medium text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.map(agent => {
              const statusMeta = getStatusMeta(agentStatuses[agent.id] || 'idle')
              return (
                <tr
                  key={agent.id}
                  className="border-t border-dark-border/50 hover:bg-dark-card-hover transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-dark-bg">
                        {agent.identity?.emoji ? (
                          <span className="text-lg">{agent.identity.emoji}</span>
                        ) : (
                          <Bot size={18} className="text-accent-blue" />
                        )}
                      </div>
                      <div className="text-sm font-medium text-dark-text">
                        {agent.name || agent.identity?.name || agent.id}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-dark-text-secondary font-mono">{agent.id}</td>

                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${statusMeta.className}`}>
                      <span className={`h-2 w-2 rounded-full ${statusMeta.dotClassName}`} />
                      {statusMeta.label}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => navigate(`/agents/${agent.id}`)}
                      className="rounded-lg border border-dark-border px-3 py-1 text-xs text-dark-text-secondary hover:bg-dark-card-hover hover:text-dark-text transition-colors"
                    >
                      Détails

                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
