import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function LoginPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await new Promise((res) => setTimeout(res, 200))
      setError('Mot de passe réinitialisé. Vérifiez votre email.')
    } catch {
      setError('Erreur inattendue.')
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
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center text-sm text-dark-text-secondary hover:text-dark-text"
        >
          <ArrowLeft size={16} className="mr-1" /> Retour
        </button>
        <h1 className="text-xl font-bold text-dark-text">Mot de passe oublié</h1>
        <p className="mt-1 text-sm text-dark-text-secondary">
          Saisissez votre nouveau mot de passe.
        </p>
        <div className="mt-4">
          <input
            type="password"
            placeholder="Nouveau mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-dark-border bg-dark-bg px-4 py-2.5 text-sm text-dark-text outline-none focus:border-accent-blue"
          />
        </div>
        {error && <p className="mt-3 text-sm text-accent-red">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-lg bg-accent-blue py-2.5 text-sm font-medium text-white hover:bg-accent-blue/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Confirmer'}
        </button>
      </form>
    </div>
  )
}
