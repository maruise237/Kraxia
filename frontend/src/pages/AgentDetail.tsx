import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Bot,
  FileText,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react'
import { fetchAgentDetail, fetchAgents } from '../store/agents'
import { getAgentFile } from '../lib/api'
import type { BackendAgent, AgentFile } from '../types/agent'

interface AgentDetailData {
  agentId: string
  workspace: string
  files: AgentFile[]
}

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [agentInfo, setAgentInfo] = useState<BackendAgent | null>(null)
  const [detail, setDetail] = useState<AgentDetailData | null>(null)
  const [expandedFiles, setExpandedFiles] = useState<Record<string, string | null>>({})
  const [loadingFiles, setLoadingFiles] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetchAgentDetail(id),
      fetchAgents(),
    ]).then(([d, agents]) => {
      setDetail(d as AgentDetailData)
      const found = agents.find((a: BackendAgent) => a.id === id)
      setAgentInfo(found || null)
    }).finally(() => setLoading(false))
  }, [id])

  const toggleFile = async (fileName: string) => {
    if (fileName in expandedFiles) {
      setExpandedFiles(prev => {
        const next = { ...prev }
        delete next[fileName]
        return next
      })
      return
    }

    if (!id) return
    setLoadingFiles(prev => ({ ...prev, [fileName]: true }))
    try {
      const result = await getAgentFile(id, fileName)
      setExpandedFiles(prev => ({ ...prev, [fileName]: result?.file?.content ?? '' }))
    } catch {
      setExpandedFiles(prev => ({ ...prev, [fileName]: '(Fichier)' }))
    } finally {
      setLoadingFiles(prev => ({ ...prev, [fileName]: false }))
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-dark-text-secondary" size={32} /></div>

  if (!agentInfo && !detail) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Bot size={48} className="mb-4 text-dark-text-secondary" />
        <p className="text-dark-text-secondary"> Agent</p>
        <button
          onClick={() => navigate('/agents')}
          className="mt-4 text-sm text-accent-blue hover:underline"
        >
          
        </button>
      </div>
    )
  }

  const agentName = agentInfo?.name || id || ''
  const emoji = agentInfo?.identity?.emoji

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="mx-auto max-w-4xl">
      <button
        onClick={() => navigate('/agents')}
        className="mb-6 flex items-center gap-2 text-sm text-dark-text-secondary hover:text-dark-text"
      >
        <ArrowLeft size={16} />
        Retour à la liste
      </button>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between rounded-xl border border-dark-border bg-dark-card p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-dark-bg">
            {emoji ? (
              <span className="text-2xl">{emoji}</span>
            ) : (
              <Bot size={28} className="text-accent-blue" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-dark-text">{agentName}</h1>
            <p className="text-sm text-dark-text-secondary">{id}</p>
          </div>
        </div>
      </div>

      {/* Workspace Info */}
      {detail?.workspace && (
        <div className="mb-6 rounded-xl border border-dark-border bg-dark-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={16} className="text-dark-text-secondary" />
            <span className="text-sm font-medium text-dark-text">Chemin du workspace</span>
          </div>
          <code className="text-sm text-dark-text-secondary">{detail.workspace}</code>
        </div>
      )}

      {/* Files */}
      {detail?.files && detail.files.length > 0 && (
        <div className="rounded-xl border border-dark-border bg-dark-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} className="text-dark-text-secondary" />
            <span className="text-sm font-medium text-dark-text">ConfigurerFichier</span>
          </div>
          <div className="space-y-2">
            {detail.files.map(file => {
              const isExpanded = file.name in expandedFiles
              const isLoading = loadingFiles[file.name]
              return (
                <div key={file.name}>
                  <div className="flex items-center justify-between rounded-lg bg-dark-bg px-4 py-2">
                    <span className={`text-sm ${file.missing ? 'text-dark-text-secondary line-through' : 'text-dark-text'}`}>
                      {file.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-dark-text-secondary">
                        {file.missing ? '' : formatSize(file.size)}
                      </span>
                      {!file.missing && (
                        <button
                          onClick={() => toggleFile(file.name)}
                          disabled={isLoading}
                          className="flex items-center gap-1 text-xs text-accent-blue/70 hover:text-accent-blue disabled:opacity-50 transition-colors"
                        >
                          {isLoading ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : isExpanded ? (
                            <>
                              <EyeOff size={13} />
                              
                            </>
                          ) : (
                            <>
                              <Eye size={13} />
                              
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  {isExpanded && expandedFiles[file.name] !== null && (
                    <pre className="mt-1 mb-1 mx-1 whitespace-pre-wrap rounded-lg bg-dark-bg/60 border border-dark-border p-4 text-sm text-dark-text leading-relaxed font-mono max-h-96 overflow-y-auto">
                      {expandedFiles[file.name]}
                    </pre>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
