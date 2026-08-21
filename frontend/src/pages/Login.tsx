import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bot, Loader2 } from 'lucide-react'
import { login, register } from '../lib/api'

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(username, password)
      } else {
        await register(username, email, password)
      }
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      setError(err?.message || 'Identifiants invalides.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark-bg px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-dark-border bg-dark-card p-6"
      >
        <div className="mb-4 flex justify-center">
          <Bot size={32} className="text-accent-blue" />
        </div>
        <h1 className="text-center text-xl font-bold text-dark-text">Kraxia</h1>
        <p className="mt-1 text-center text-sm text-dark-text-secondary">
          {mode === 'login' ? 'Connectez-vous à votre compte.' : 'Créez votre compte.'}
        </p>

        <div className="mt-4 space-y-3">
          <input
            type="text"
            placeholder="Nom d'utilisateur"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            className="w-full rounded-lg border border-dark-border bg-dark-bg px-4 py-2.5 text-sm text-dark-text outline-none focus:border-accent-blue"
          />
          {mode === 'register' && (
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-dark-border bg-dark-bg px-4 py-2.5 text-sm text-dark-text outline-none focus:border-accent-blue"
            />
          )}
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="w-full rounded-lg border border-dark-border bg-dark-bg px-4 py-2.5 text-sm text-dark-text outline-none focus:border-accent-blue"
          />
        </div>

        {error && <p className="mt-3 text-sm text-accent-red">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-lg bg-accent-blue py-2.5 text-sm font-medium text-white hover:bg-accent-blue/90 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          ) : mode === 'login' ? (
            'Se connecter'
          ) : (
            "S'inscrire"
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setError('')
            setMode(mode === 'login' ? 'register' : 'login')
          }}
          className="mt-3 w-full text-center text-sm text-dark-text-secondary hover:text-dark-text"
        >
          {mode === 'login' ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
        </button>
      </form>
    </div>
  )
}
