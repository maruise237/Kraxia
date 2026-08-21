import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { getMe, listAgents, changePassword, logout } from '../lib/api'
import type { AuthUtilisateur } from '../lib/api'
import Brand from './Brand'
import {
  LayoutDashboard,
  Bot,
  Zap,
  Radio,
  Brain,
  FolderOpen,
  BookOpen,
  MessageSquare,
  Clock,
  Monitor,
  Code2,
  Settings,
  Utilisateur,
  Puzzle,
  KeyRound,
  LogOut,
  X,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react'

const navSections = [
  {
    label: '',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    ],
  },
  {
    label: 'Agents',
    items: [
      { to: '/agents', icon: Bot, label: 'Agents', badgeKey: 'agents' },
      { to: '/chat', icon: MessageSquare, label: 'Sessions' },
    ],
  },
  {
    label: 'Centre de compétences',
    items: [
      { to: '/skills', icon: Zap, label: 'Bibliothèque de compétences' },
      { to: '/channels', icon: Radio, label: 'Canaux de communication' },
      { to: '/plugins', icon: Puzzle, label: 'Gestion des extensions' },
      { to: '/models', icon: Brain, label: 'Modèles IA' },
      { to: '/files', icon: FolderOpen, label: 'Gestionnaire de fichiers' },
      { to: '/knowledge', icon: BookOpen, label: 'Base de connaissances' },
    ],
  },
  {
    label: '',
    items: [
      { to: '/terminal', icon: Monitor, label: 'Terminal temps réel' },
      { to: '/sessions', icon: MessageSquare, label: 'Historique des conversations' },
      { to: '/cron', icon: Clock, label: 'Tâches planifiées' },
      { to: '/nodes', icon: Monitor, label: 'Gestion des nœuds' },
      { to: '/api', icon: Code2, label: 'Accès API' },
      { to: '/settings', icon: Settings, label: 'Paramètres système' },
    ],
  },
]

export default function Sidebar() {
  const location = useLocation()
  const [user, setUtilisateur] = useState<AuthUtilisateur | null>(null)
  const [agentCount, setAgentCount] = useState<number>(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [pwdModalOpen, setPwdModalOpen] = useState(false)
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getMe().then(setUtilisateur).catch(() => {})
    listAgents().then(r => setAgentCount(r.agents?.length ?? 0)).catch(() => {})
  }, [])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const openPwdModal = () => {
    setMenuOpen(false)
    setOldPwd('')
    setNewPwd('')
    setConfirmPwd('')
    setPwdError('')
    setPwdSuccess('')
    setShowOld(false)
    setShowNew(false)
    setPwdModalOpen(true)
  }

  const handleChangePwd = async () => {
    setPwdError('')
    setPwdSuccess('')
    if (!oldPwd) { setPwdError('Mot de passe'); return }
    if (newPwd.length < 6) { setPwdError('Mot de passe6'); return }
    if (newPwd !== confirmPwd) { setPwdError('Mot de passe'); return }
    setPwdLoading(true)
    try {
      await changePassword(oldPwd, newPwd)
      setPwdSuccess('Mot de passe')
      setTimeout(() => setPwdModalOpen(false), 1500)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Échec de la modification'
      setPwdError(msg.includes('Mot de passe') ? 'Mot de passe' : msg)
    } finally {
      setPwdLoading(false)
    }
  }

  return (
    <aside className="flex w-56 flex-col bg-dark-sidebar border-r border-dark-border">
      {/* Logo */}
      <Brand />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {navSections.map(section => (
          <div key={section.label} className="mb-4">
            <div className="mb-1.5 px-3 text-xs font-medium uppercase tracking-wider text-dark-text-secondary">
              {section.label}
            </div>
            {section.items.map(item => {
              const Icon = item.icon
              const isActive = location.pathname === item.to ||
                (item.to !== '/dashboard' && location.pathname.startsWith(item.to))
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-accent-blue/15 text-accent-blue'
                      : 'text-dark-text-secondary hover:bg-dark-card hover:text-dark-text'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                  {'badgeKey' in item && item.badgeKey === 'agents' && agentCount > 0 && (
                    <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent-blue/20 px-1 text-xs text-accent-blue">
                      {agentCount}
                    </span>
                  )}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Utilisateur */}
      <div className="relative border-t border-dark-border px-4 py-3" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex w-full items-center gap-3 rounded-lg p-1 hover:bg-dark-card transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-purple text-sm font-medium text-white">
            <Utilisateur size={16} />
          </div>
          <div className="text-left">
            <div className="text-sm font-medium text-dark-text">{user?.username ?? 'Admin'}</div>
            <div className="text-xs text-dark-text-secondary">{user?.email ?? ''}</div>
          </div>
        </button>

        {/* Popup menu */}
        {menuOpen && (
          <div className="absolute bottom-full left-4 mb-2 w-48 rounded-lg border border-dark-border bg-dark-sidebar shadow-lg py-1 z-50">
            <button
              onClick={openPwdModal}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-dark-text hover:bg-dark-card transition-colors"
            >
              <KeyRound size={15} />
              Mot de passe
            </button>
            <button
              onClick={() => logout()}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-accent-red hover:bg-dark-card transition-colors"
            >
              <LogOut size={15} />
              Se déconnecter
            </button>
          </div>
        )}
      </div>

      {/* Password Change Modal */}
      {pwdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-96 rounded-xl border border-dark-border bg-dark-sidebar p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-dark-text">Mot de passe</h3>
              <button onClick={() => setPwdModalOpen(false)} className="text-dark-text-secondary hover:text-dark-text">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Old password */}
              <div>
                <label className="block text-xs text-dark-text-secondary mb-1">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showOld ? 'text' : 'password'}
                    value={oldPwd}
                    onChange={e => setOldPwd(e.target.value)}
                    className="w-full rounded-lg border border-dark-border bg-dark-bg px-3 py-2 pr-9 text-sm text-dark-text focus:border-accent-blue focus:outline-none"
                    placeholder="Mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOld(!showOld)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-text-secondary hover:text-dark-text"
                  >
                    {showOld ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div>
                <label className="block text-xs text-dark-text-secondary mb-1">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                    className="w-full rounded-lg border border-dark-border bg-dark-bg px-3 py-2 pr-9 text-sm text-dark-text focus:border-accent-blue focus:outline-none"
                    placeholder="Au moins 6 caractères"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-text-secondary hover:text-dark-text"
                  >
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-xs text-dark-text-secondary mb-1">Mot de passe</label>
                <input
                  type={showNew ? 'text' : 'password'}
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleChangePwd()}
                  className="w-full rounded-lg border border-dark-border bg-dark-bg px-3 py-2 text-sm text-dark-text focus:border-accent-blue focus:outline-none"
                  placeholder="Mot de passe"
                />
              </div>

              {/* Error / Success */}
              {pwdError && <div className="rounded-lg bg-accent-red/10 px-3 py-2 text-xs text-accent-red">{pwdError}</div>}
              {pwdSuccess && <div className="rounded-lg bg-green-500/10 px-3 py-2 text-xs text-green-400">{pwdSuccess}</div>}

              {/* Submit */}
              <button
                onClick={handleChangePwd}
                disabled={pwdLoading}
                className="w-full rounded-lg bg-accent-blue py-2 text-sm font-medium text-white hover:bg-accent-blue/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {pwdLoading && <Loader2 size={14} className="animate-spin" />}
                Confirmer la modification
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
