import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bot, Loader2 } from 'lucide-react'
import { createNewAgent } from '../store/agents'

// Convert display name to a valid agent ID (ASCII only, lowercase)
function toAgentId(name: string): string {
  // transliterate common CJK → pinyin-like slug is complex;
  // just strip non-ASCII and collapse to dashes
  const id = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .slice(0, 64)
  return id || ''
}

export default function AgentCreate() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const WORKSPACE_PREFIX = '~/.openclaw/workspace_'
  const [form, setForm] = useState({
    displayName: '',
    agentId: '',
    agentIdManual: false, // true if user has manually edited the ID
    workspaceSuffix: '',
  })

  const effectiveId = form.agentId || toAgentId(form.displayName)
  const hasValidId = /^[a-z0-9][a-z0-9_-]*$/.test(effectiveId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!effectiveId || !hasValidId) return

    setLoading(true)
    setError('')

    try {
      const suffix = form.workspaceSuffix.trim()
      const workspace = suffix ? `${WORKSPACE_PREFIX}${suffix}` : undefined
      await createNewAgent(effectiveId, workspace)
      navigate('/agents')
    } catch (err: any) {
      setError(err?.message || 'Échec de la création, réessayez')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => navigate('/agents')}
        className="mb-6 flex items-center gap-2 text-sm text-dark-text-secondary hover:text-dark-text"
      >
        <ArrowLeft size={16} />
        Retour à la liste
      </button>

      <div className="rounded-xl border border-dark-border bg-dark-card p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-blue">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-dark-text">Créer un agent</h1>
            <p className="text-sm text-dark-text-secondary">Configurer et créer un nouvel agent IA</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-accent-red/10 p-3 text-sm text-accent-red">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Display Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-dark-text">Nom affiché *</label>
            <input
              type="text"
              required
              value={form.displayName}
              onChange={e => {
                const val = e.target.value
                setForm(f => ({
                  ...f,
                  displayName: val,
                  // Auto-sync agent ID if user hasn't manually edited it
                  ...(f.agentIdManual ? {} : { agentId: '' }),
                }))
              }}
              placeholder="ex : Assistant Service Client"
              className="w-full rounded-lg border border-dark-border bg-dark-bg px-4 py-2.5 text-sm text-dark-text outline-none focus:border-accent-blue placeholder:text-dark-text-secondary"
            />
          </div>

          {/* Identifiant de l'agent */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-dark-text">Identifiant de l'agent *</label>
            <input
              type="text"
              value={form.agentId || (form.agentIdManual ? '' : toAgentId(form.displayName))}
              onChange={e => setForm(f => ({ ...f, agentId: e.target.value, agentIdManual: true }))}
              placeholder="insurance-agent"
              className={`w-full rounded-lg border bg-dark-bg px-4 py-2.5 text-sm text-dark-text outline-none placeholder:text-dark-text-secondary ${
                effectiveId && !hasValidId
                  ? 'border-accent-red focus:border-accent-red'
                  : 'border-dark-border focus:border-accent-blue'
              }`}
            />
            <p className="mt-1 text-xs text-dark-text-secondary">
              Lettres minuscules, chiffres, tirets, underscores
              {form.displayName && !form.agentIdManual && !toAgentId(form.displayName) && (
                <span className="text-accent-yellow ml-1">- Saisir un identifiant en anglais</span>
              )}
            </p>
          </div>

          {/* Workspace */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-dark-text">Chemin du workspace</label>
            <div className="flex items-center rounded-lg border border-dark-border bg-dark-bg overflow-hidden focus-within:border-accent-blue">
              <span className="shrink-0 px-3 py-2.5 text-sm text-dark-text-secondary select-none border-r border-dark-border bg-dark-card">
                {WORKSPACE_PREFIX}
              </span>
              <input
                type="text"
                value={form.workspaceSuffix}
                onChange={e => setForm(f => ({ ...f, workspaceSuffix: e.target.value }))}
                placeholder={effectiveId || '<agent-id>'}
                className="flex-1 bg-transparent px-3 py-2.5 text-sm text-dark-text outline-none placeholder:text-dark-text-secondary"
              />
            </div>
            <p className="mt-1 text-xs text-dark-text-secondary">Laisser vide pour génération auto</p>
          </div>

          {/* Info box */}
          <div className="rounded-lg bg-accent-blue/10 p-4 text-sm text-accent-blue">
            Appel à la création :<code className="rounded bg-dark-bg px-1.5 py-0.5 text-xs">
              agents.create(name: "{effectiveId || '<agent-id>'}"
              {form.workspaceSuffix.trim() ? `, workspace: "${WORKSPACE_PREFIX}${form.workspaceSuffix.trim()}"` : ''})
            </code>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading || !effectiveId || !hasValidId}
              className="flex items-center gap-2 rounded-lg bg-accent-blue px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-blue/90 disabled:opacity-50 transition-colors"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Créer l'agent
            </button>
            <button
              type="button"
              onClick={() => navigate('/agents')}
              className="rounded-lg border border-dark-border px-6 py-2.5 text-sm text-dark-text-secondary hover:text-dark-text transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
