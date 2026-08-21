import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, Plus, Search, Loader2 } from 'lucide-react'
import { fetchAgents, removeAgent } from '../store/agents'
import type { BackendAgent } from '../types/agent'

export default function Agents() {
  const navigate = useNavigate()
  const [agents, setAgents] = useState<BackendAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchAgents()
      .then(setAgents)
      .finally(() => setLoading(false))
  }, [])

  const filtered = agents.filter(a => {
    const term = search.toLowerCase()
    const name = a.name || a.identity?.name || a.id || ''
    return name.toLowerCase().includes(term) || (a.id || '').toLowerCase().includes(term)
  })

  const handleStartChat = (agentId: string) => {
    const sessionKey = `agent:${agentId}:session-${Date.now()}`
    navigate(`/chat?session=${encodeURIComponent(sessionKey)}`)
  }

  const handleDelete = async (e: React.MouseEvent, agent: BackendAgent) => {
    e.stopPropagation()
    if (confirm('Confirmer la suppression ?')) {
      await removeAgent(agent.id)
      const refreshed = await fetchAgents()
      setAgents(refreshed)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-dark-text-secondary" size={32} /></div>

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-text">Gestion des agents</h1>
          <p className="mt-1 text-sm text-dark-text-secondary">Administrer et configurer vos agents IA</p>
        </div>
        <button
          onClick={() => navigate('/agents/create')}
          className="flex items-center gap-2 rounded-lg bg-accent-blue px-4 py-2 text-sm font-medium text-white hover:bg-accent-blue/90 transition-colors"
        >
          <Plus size={16} />
          Créer un agent
        </button>
      </div>

      {/* Search */}
      <div className="mb-4 flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-lg bg-dark-card px-3 py-2">
          <Search size={16} className="text-dark-text-secondary" />
          <input
            type="text"
            placeholder=" Nom de l'agent ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm text-dark-text outline-none placeholder:text-dark-text-secondary"
          />
        </div>
      </div>

      {/* agent Cards Grid */}
      <div className="grid grid-cols-3 gap-4">
        {filtered.map(agent => (
          <div
            key={agent.id}
            className="rounded-xl border border-dark-border bg-dark-card p-5 hover:border-accent-blue/30 transition-colors cursor-pointer"
            onClick={() => handleStartChat(agent.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-dark-bg">
                  {agent.identity?.emoji ? (
                    <span className="text-lg">{agent.identity.emoji}</span>
                  ) : (
                    <Bot size={20} className="text-accent-blue" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-dark-text">{agent.name || agent.identity?.name || agent.id}</div>
                  <div className="text-xs text-dark-text-secondary">{agent.id}</div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                onClick={e => {
                  e.stopPropagation()
                  navigate(`/agents/${agent.id}`)
                }}
                className="text-xs text-dark-text-secondary hover:text-dark-text"
              >
                
              </button>
              <button
                onClick={e => handleDelete(e, agent)}
                className="text-xs text-accent-red/70 hover:text-accent-red"
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
