import { useState, useEffect } from 'react'
import {
  Loader2,
  Save,
  RefreshCw,
  Server,
  Shield,
  Globe,
  AlertCircle,
  CheckCircle,
  X,
  RotateCcw,
  Container,
  Wrench,
  Copy,
} from 'lucide-react'
import { getStatus, fetchJSON, restartGateway, getContainerInfo, runDoctorFix } from '../lib/api'
import type { ContainerInfo, DoctorFixResult } from '../lib/api'

interface OpenClawConfig {
  gateway?: {
    mode?: string
    port?: number
    bind?: string
    auth?: { mode?: string }
    controlUi?: {
      allowedOrigins?: string[]
    }
  }
  [key: string]: unknown
}

export default function SystemSettings() {
  const [status, setStatus] = useState<Record<string, unknown> | null>(null)
  const [config, setConfig] = useState<OpenClawConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Container info
  const [containerInfo, setContainerInfo] = useState<ContainerInfo | null>(null)
  const [doctorRunning, setDoctorRunning] = useState(false)
  const [doctorResult, setDoctorResult] = useState<DoctorFixResult | null>(null)

  // Editable fields
  const [gatewayBind, setGatewayBind] = useState('')
  const [gatewayPort, setGatewayPort] = useState('')
  const [allowedOrigins, setAllowedOrigins] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [statusData, configData, containerData] = await Promise.all([
        getStatus().catch(() => null),
        fetchJSON<{ config: OpenClawConfig }>('/api/openclaw/settings/config').catch(() => ({ config: null })),
        getContainerInfo().catch(() => null),
      ])
      setStatus(statusData)
      setContainerInfo(containerData)
      if (configData.config) {
        const cfg = configData.config
        setConfig(cfg)
        setGatewayBind(cfg.gateway?.bind || 'loopback')
        setGatewayPort(String(cfg.gateway?.port || '18789'))
        setAllowedOrigins(
          (cfg.gateway?.controlUi?.allowedOrigins || []).join('\n')
        )
      }
    } catch (err: any) {
      setError(err?.message || 'Échec du chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const flash = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const updates: OpenClawConfig = {
        gateway: {
          bind: gatewayBind || 'loopback',
          port: parseInt(gatewayPort, 10) || 18789,
          controlUi: {
            allowedOrigins: allowedOrigins
              .split('\n')
              .map(s => s.trim())
              .filter(Boolean),
          },
        },
      }

      await fetchJSON('/api/openclaw/settings/config', {
        method: 'PUT',
        body: JSON.stringify(updates),
      })
      flash('Enregistrer，「Redémarrer la passerelle」Configurer')
    } catch (err: any) {
      setError(err?.message || 'Enregistrer')
    } finally {
      setSaving(false)
    }
  }

  const [configError, setConfigError] = useState('')

  const handleRestart = async () => {
    if (!confirm('ConfirmerRedémarrer la passerelle？。')) return
    setRestarting(true)
    setError('')
    setConfigError('')
    try {
      await restartGateway()
      flash('Passerelle redémarrée')
      // Reload status after restart
      setTimeout(() => loadData(), 1000)
    } catch (err: any) {
      const msg = err?.message || ''
      // Config validation errors contain "Invalid config" from openclaw doctor
      if (msg.includes('Invalid config')) {
        setConfigError(msg)
      } else {
        setError(msg)
      }
    } finally {
      setRestarting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-accent-blue" />
      </div>
    )
  }

  const gatewayConnected = status?.gateway_connected === true

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-text">Paramètres système</h1>
          <p className="mt-1 text-sm text-dark-text-secondary">
            Gestion OpenClaw Configurer
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 rounded-lg border border-dark-border px-3 py-1.5 text-xs text-dark-text-secondary hover:text-dark-text transition-colors"
        >
          <RefreshCw size={14} />
          Actualiser
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-accent-red/10 p-3 text-sm text-accent-red flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}
      {configError && (
        <div className="mb-4 rounded-lg bg-accent-red/10 p-4 text-sm text-accent-red">
          <div className="flex items-center gap-2 mb-2 font-medium">
            <AlertCircle size={16} />
            Configurer，Redémarrer la passerelle
            <button onClick={() => setConfigError('')} className="ml-auto"><X size={14} /></button>
          </div>
          <pre className="text-xs font-mono whitespace-pre-wrap text-accent-red/80 bg-accent-red/5 rounded p-2 mt-1">
            {configError}
          </pre>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 rounded-lg bg-accent-green/10 p-3 text-sm text-accent-green flex items-center gap-2">
          <CheckCircle size={16} />
          {successMsg}
        </div>
      )}

      <div className="space-y-6 max-w-2xl">
        {/* Gateway Status */}
        <section className="rounded-xl border border-dark-border bg-dark-card overflow-hidden">
          <div className="px-5 py-3 border-b border-dark-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server size={16} className="text-dark-text-secondary" />
              <h2 className="text-sm font-semibold text-dark-text">État de la passerelle</h2>
            </div>
            <button
              onClick={handleRestart}
              disabled={restarting}
              className="flex items-center gap-1.5 rounded-lg border border-dark-border px-3 py-1.5 text-xs text-dark-text-secondary hover:text-accent-yellow hover:border-accent-yellow transition-colors disabled:opacity-50"
              title="Redémarrer la passerelle"
            >
              <RotateCcw size={13} className={restarting ? 'animate-spin' : ''} />
              {restarting ? 'Redémarrage en cours...' : 'Redémarrer la passerelle'}
            </button>
          </div>
          <div className="px-5 py-4">
            <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-2.5 text-sm">
              <span className="text-dark-text-secondary">ConnecterÉtat</span>
              <span className="flex items-center gap-1.5">
                <span className={`inline-block w-2 h-2 rounded-full ${gatewayConnected ? 'bg-accent-green' : 'bg-accent-red'}`} />
                <span className={gatewayConnected ? 'text-accent-green' : 'text-accent-red'}>
                  {gatewayConnected ? 'Connecter' : 'Connecter'}
                </span>
              </span>

              <span className="text-dark-text-secondary">ConfigurerFichier</span>
              <span className="text-dark-text font-mono text-xs">{String(status?.config_path || '-')}</span>

              <span className="text-dark-text-secondary">Workspace</span>
              <span className="text-dark-text font-mono text-xs">{String(status?.workspace || '-')}</span>

              <span className="text-dark-text-secondary">Modèle actuel</span>
              <span className="text-dark-text font-mono text-xs">{String(status?.model || '-')}</span>
            </div>
          </div>
        </section>

        {/* Container Info */}
        <section className="rounded-xl border border-dark-border bg-dark-card overflow-hidden">
          <div className="px-5 py-3 border-b border-dark-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Container size={16} className="text-dark-text-secondary" />
              <h2 className="text-sm font-semibold text-dark-text">Informations sur le conteneur</h2>
            </div>
            <button
              onClick={async () => {
                if (!confirm('Confirmer？ConfigurerRedémarrer la passerelle。')) return
                setDoctorRunning(true)
                setDoctorResult(null)
                setError('')
                try {
                  const result = await runDoctorFix()
                  setDoctorResult(result)
                  if (result.exit_code === 0) {
                    flash('Réparation terminée, conteneur redémarré')
                    // Reload data after a short delay to reflect new status
                    setTimeout(() => loadData(), 5000)
                  } else {
                    setError('Code de sortie non nul')
                  }
                } catch (err: any) {
                  setError(err?.message || 'Échec de la réparation')
                } finally {
                  setDoctorRunning(false)
                }
              }}
              disabled={doctorRunning || !containerInfo?.container_name || containerInfo?.status === 'none'}
              className="flex items-center gap-1.5 rounded-lg border border-dark-border px-3 py-1.5 text-xs text-dark-text-secondary hover:text-accent-blue hover:border-accent-blue transition-colors disabled:opacity-50"
              title=" openclaw doctor --fix Configurer"
            >
              <Wrench size={13} className={doctorRunning ? 'animate-spin' : ''} />
              {doctorRunning ? 'Réparation en cours...' : 'Réparation automatique'}
            </button>
          </div>
          <div className="px-5 py-4">
            {containerInfo?.container_name ? (
              <>
                <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-2.5 text-sm">
                  <span className="text-dark-text-secondary">Nom</span>
                  <span className="flex items-center gap-2">
                    <span className="text-dark-text font-mono text-xs">{containerInfo.container_name}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(containerInfo.container_name || '')
                        flash('CopiéNom')
                      }}
                      className="text-dark-text-secondary hover:text-dark-text transition-colors"
                      title="Nom"
                    >
                      <Copy size={12} />
                    </button>
                  </span>

                  <span className="text-dark-text-secondary">État du conteneur</span>
                  <span className="flex items-center gap-1.5">
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      containerInfo.status === 'running' ? 'bg-accent-green' :
                      containerInfo.status === 'restarting' ? 'bg-accent-red animate-pulse' :
                      containerInfo.status === 'creating' ? 'bg-accent-yellow' : 'bg-accent-red'
                    }`} />
                    <span className={
                      containerInfo.status === 'running' ? 'text-accent-green' :
                      containerInfo.status === 'restarting' ? 'text-accent-red' :
                      containerInfo.status === 'creating' ? 'text-accent-yellow' : 'text-dark-text-secondary'
                    }>
                      {containerInfo.status === 'running' ? 'En cours' :
                       containerInfo.status === 'restarting' ? 'Redémarrage anormal' :
                       containerInfo.status === 'creating' ? 'Création' :
                       containerInfo.status === 'paused' ? 'En pause' :
                       containerInfo.status === 'exited' ? 'Arrêté' :
                       containerInfo.status === 'archived' ? 'Archivé' : containerInfo.status}
                    </span>
                  </span>

                  <span className="text-dark-text-secondary">Créé le</span>
                  <span className="text-dark-text text-xs">
                    {containerInfo.created_at ? new Date(containerInfo.created_at).toLocaleString('zh-CN') : '-'}
                  </span>
                </div>

                {containerInfo.ports && containerInfo.ports.filter(function(p) { return p.host_port; }).length > 0 && (
                  <div className="mt-3 rounded-lg bg-dark-bg p-3 border border-dark-border">
                    <span className="text-xs font-medium text-dark-text-secondary">Mappage de ports</span>
                    <div className="mt-2 space-y-1">
                      {containerInfo.ports.filter(function(p) { return p.host_port; }).map(function(p) {
                        return (
                          <div key={p.container_port} className="flex items-center gap-2 text-xs font-mono">
                            <span className="text-dark-text-secondary">{p.container_port}</span>
                            <span className="text-dark-text-secondary">{'→'}</span>
                            <span className="text-dark-text">{p.host_port}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-dark-text-secondary">Aucun conteneur</p>
            )}

            {doctorResult && (
              <div className="mt-4 rounded-lg bg-dark-bg p-3 border border-dark-border">
                <div className="flex items-center gap-2 mb-2">
                  {doctorResult.exit_code === 0 ? (
                    <CheckCircle size={14} className="text-accent-green" />
                  ) : (
                    <AlertCircle size={14} className="text-accent-red" />
                  )}
                  <span className="text-xs font-medium text-dark-text">
                     (exit code: {doctorResult.exit_code})
                  </span>
                </div>
                <pre className="text-xs text-dark-text-secondary font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {doctorResult.stdout || doctorResult.stderr || '()'}
                </pre>
              </div>
            )}

            <p className="mt-3 text-[11px] text-dark-text-secondary">
              ，NomGestion。Configurer，「Réparation automatique」。
            </p>
          </div>
        </section>

        {/* Gateway Config */}
        <section className="rounded-xl border border-dark-border bg-dark-card overflow-hidden">
          <div className="px-5 py-3 border-b border-dark-border flex items-center gap-2">
            <Globe size={16} className="text-dark-text-secondary" />
            <h2 className="text-sm font-semibold text-dark-text">Configurer</h2>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-dark-text-secondary mb-1">
                  Adresse de liaison
                </label>
                <select
                  value={gatewayBind}
                  onChange={e => setGatewayBind(e.target.value)}
                  className="w-full rounded-lg border border-dark-border bg-dark-bg px-3 py-2 text-sm text-dark-text outline-none focus:border-accent-blue"
                >
                  <option value="loopback">loopback (machine locale uniquement)</option>
                  <option value="all">all (toutes les interfaces)</option>
                  <option value="tailscale">tailscale</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-text-secondary mb-1">
                  
                </label>
                <input
                  type="number"
                  value={gatewayPort}
                  onChange={e => setGatewayPort(e.target.value)}
                  placeholder="18789"
                  className="w-full rounded-lg border border-dark-border bg-dark-bg px-3 py-2 text-sm text-dark-text outline-none focus:border-accent-blue"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-text-secondary mb-1">
                Origines autorisées (CORS)
              </label>
              <textarea
                value={allowedOrigins}
                onChange={e => setAllowedOrigins(e.target.value)}
                rows={4}
                placeholder={"http://localhost:3080\nhttp://127.0.0.1:8080"}
                className="w-full rounded-lg border border-dark-border bg-dark-bg px-3 py-2 text-sm text-dark-text outline-none focus:border-accent-blue placeholder:text-dark-text-secondary font-mono resize-none"
              />
              <p className="mt-1 text-[11px] text-dark-text-secondary">
                Une URL par ligne, pour CORS
              </p>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="rounded-xl border border-dark-border bg-dark-card overflow-hidden">
          <div className="px-5 py-3 border-b border-dark-border flex items-center gap-2">
            <Shield size={16} className="text-dark-text-secondary" />
            <h2 className="text-sm font-semibold text-dark-text">À propos</h2>
          </div>
          <div className="px-5 py-4">
            <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-2.5 text-sm">
              <span className="text-dark-text-secondary">Version</span>
              <span className="text-dark-text">v2026.3</span>

              <span className="text-dark-text-secondary">OpenClaw</span>
              <span className="text-dark-text font-mono text-xs">openclaw gateway</span>

              <span className="text-dark-text-secondary">Mode d'authentification</span>
              <span className="text-dark-text">{config?.gateway?.auth?.mode || 'none'}</span>

              <span className="text-dark-text-secondary">Répertoire de données</span>
              <span className="text-dark-text font-mono text-xs">{String(status?.config_path || '').replace('/openclaw.json', '') || '~/.openclaw'}</span>
            </div>
          </div>
        </section>

        {/* Save button */}
        <div className="flex gap-3 pb-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-accent-blue px-5 py-2 text-sm font-medium text-white hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Enregistrer
          </button>
          <p className="text-xs text-dark-text-secondary self-center">
            Enregistrer「Redémarrer la passerelle」Configurer
          </p>
        </div>
      </div>
    </div>
  )
}
