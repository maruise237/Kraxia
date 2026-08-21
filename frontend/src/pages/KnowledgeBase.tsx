import { useState, useEffect, useRef } from 'react'
import {
  FileText,
  Upload,
  Trash2,
  Download,
  Loader2,
  FolderPlus,
  BookOpen,
  Folder,
  ArrowLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'
import {
  listAgents,
  browseFiles,
  uploadFile,
  deleteFile,
  createDirectory,
} from '../lib/api'
import type { FileEntry, BrowseResult } from '../lib/api'

/** Resolve the knowledge base root path for an agent */
function knowledgeRoot(agentId: string): string {
  return `profiles/${agentId}/workspace/knowledge`
}

export default function KnowledgeBase() {
  // agent selection
  const [agents, setAgents] = useState<{ id: string; name?: string }[]>([])
  const [selectedAgent, setSelectedAgent] = useState('')
  const [agentsLoading, setAgentsLoading] = useState(true)

  // File browsing state (relative to knowledge root)
  const [subPath, setSubPath] = useState('') // path within knowledge/
  const [data, setData] = useState<BrowseResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Upload / delete / new folder
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Preview
  const [previewFile, setPreviewFile] = useState<{ name: string; content: string } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Load agents on mount
  useEffect(() => {
    listAgents()
      .then(r => {
        const list = r.agents || []
        setAgents(list)
        if (list.length > 0) setSelectedAgent(list[0].id)
      })
      .catch(() => {})
      .finally(() => setAgentsLoading(false))
  }, [])

  // Compute the full browse path
  const fullPath = (sub: string) => {
    const root = knowledgeRoot(selectedAgent)
    return sub ? `${root}/${sub}` : root
  }

  // Load directory contents
  const loadDir = async (sub: string) => {
    if (!selectedAgent) return
    setLoading(true)
    setError('')
    setPreviewFile(null)
    try {
      const result = await browseFiles(fullPath(sub))
      setData(result)
      setSubPath(sub)
    } catch (err: any) {
      // If directory doesn't exist, try to create it
      if (err?.message?.includes('404') || err?.message?.includes('not found') || err?.message?.includes('Not Found')) {
        try {
          await createDirectory(fullPath(sub))
          const result = await browseFiles(fullPath(sub))
          setData(result)
          setSubPath(sub)
        } catch (err2: any) {
          setError(err2?.message || 'Échec du chargement')
        }
      } else {
        setError(err?.message || 'Échec du chargement')
      }
    } finally {
      setLoading(false)
    }
  }

  // Reload when agent changes
  useEffect(() => {
    if (selectedAgent) {
      setSubPath('')
      loadDir('')
    }
  }, [selectedAgent])

  const navigateTo = (sub: string) => loadDir(sub)

  const goUp = () => {
    if (!subPath) return
    const parent = subPath.split('/').slice(0, -1).join('/')
    navigateTo(parent)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    setError('')
    try {
      for (const file of Array.from(files)) {
        await uploadFile(file, fullPath(subPath))
      }
      await loadDir(subPath)
    } catch (err: any) {
      setError(err?.message || '')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (entry: FileEntry) => {
    const label = entry.type === 'directory' ? 'Dossier' : 'Fichier'
    if (!confirm(`ConfirmerSupprimer${label} "${entry.name}"？`)) return
    setDeleting(entry.path)
    setError('')
    try {
      await deleteFile(entry.path)
      await loadDir(subPath)
    } catch (err: any) {
      setError(err?.message || 'Supprimer')
    } finally {
      setDeleting(null)
    }
  }

  const handleDownload = async (entry: FileEntry) => {
    const token = localStorage.getItem('openclaw_access_token')
    const url = `/api/openclaw/filemanager/download?path=${encodeURIComponent(entry.path)}`
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(url, { headers })
    if (!res.ok) return
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = entry.name
    a.click()
    URL.revokeObjectURL(blobUrl)
  }

  const handleNewFolder = async () => {
    if (!newFolderName.trim()) return
    setError('')
    try {
      const folderPath = subPath
        ? `${fullPath(subPath)}/${newFolderName.trim()}`
        : `${fullPath('')}/${newFolderName.trim()}`
      await createDirectory(folderPath)
      setShowNewFolder(false)
      setNewFolderName('')
      await loadDir(subPath)
    } catch (err: any) {
      setError(err?.message || '')
    }
  }

  const handlePreview = async (entry: FileEntry) => {
    if (previewFile?.name === entry.name) {
      setPreviewFile(null)
      return
    }
    setPreviewLoading(true)
    try {
      const res = await browseFiles(entry.path)
      const fileRes = res as any
      if (fileRes.content !== undefined) {
        setPreviewFile({ name: entry.name, content: fileRes.content })
      } else {
        setPreviewFile({ name: entry.name, content: '(Fichier，)' })
      }
    } catch {
      setPreviewFile({ name: entry.name, content: '(Fichier)' })
    } finally {
      setPreviewLoading(false)
    }
  }

  const breadcrumbs = subPath ? subPath.split('/') : []

  const formatSize = (bytes: number | null) => {
    if (bytes === null) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const isTextFile = (entry: FileEntry) => {
    const ct = entry.content_type || ''
    const ext = entry.name.split('.').pop()?.toLowerCase() || ''
    return ct.startsWith('text/') ||
      ct === 'application/json' ||
      ['md', 'json', 'yml', 'yaml', 'toml', 'jsonl', 'txt', 'xml', 'csv', 'log', 'sh', 'ts', 'js', 'py', 'pdf'].includes(ext)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark-text">Base de connaissances</h1>
        <p className="mt-1 text-sm text-dark-text-secondary">
          Gestion agent Base de connaissancesFichier，、PDF、Fichier
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-accent-red/10 p-3 text-sm text-accent-red">{error}</div>
      )}

      {/* agent selector */}
      <div className="mb-4 flex items-center gap-4">
        <label className="text-sm font-medium text-dark-text"> Agent：</label>
        {agentsLoading ? (
          <Loader2 size={16} className="animate-spin text-accent-blue" />
        ) : agents.length === 0 ? (
          <span className="text-sm text-dark-text-secondary"> Agent</span>
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={selectedAgent}
              onChange={e => setSelectedAgent(e.target.value)}
              className="rounded-lg border border-dark-border bg-dark-bg px-3 py-2 text-sm text-dark-text outline-none focus:border-accent-blue"
            >
              {agents.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name || a.id}{a.id === 'main' ? ' ()' : ''}
                </option>
              ))}
            </select>
            <button
              onClick={() => loadDir(subPath)}
              className="flex items-center gap-1 rounded-lg border border-dark-border px-3 py-2 text-xs text-dark-text-secondary hover:text-dark-text transition-colors"
              title="Actualiser"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Only show file browser when an agent is selected */}
      {selectedAgent && (
        <>
          {/* Toolbar */}
          <div className="mb-4 flex items-center justify-between">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 text-sm">
              <button
                onClick={() => navigateTo('')}
                className="flex items-center gap-1 text-dark-text-secondary hover:text-accent-blue transition-colors"
                title={`/opt/data/${knowledgeRoot(selectedAgent)}`}
              >
                <BookOpen size={15} />
                <span className="text-xs">knowledge</span>
              </button>
              {breadcrumbs.map((seg, i) => {
                const segPath = breadcrumbs.slice(0, i + 1).join('/')
                const isLast = i === breadcrumbs.length - 1
                return (
                  <span key={segPath} className="flex items-center gap-1">
                    <ChevronRight size={14} className="text-dark-text-secondary" />
                    {isLast ? (
                      <span className="text-dark-text font-medium">{seg}</span>
                    ) : (
                      <button
                        onClick={() => navigateTo(segPath)}
                        className="text-dark-text-secondary hover:text-accent-blue transition-colors"
                      >
                        {seg}
                      </button>
                    )}
                  </span>
                )
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {subPath && (
                <button
                  onClick={goUp}
                  className="flex items-center gap-1 rounded-lg border border-dark-border px-3 py-1.5 text-xs text-dark-text-secondary hover:text-dark-text transition-colors"
                >
                  <ArrowLeft size={14} />
                  
                </button>
              )}
              <button
                onClick={() => setShowNewFolder(true)}
                className="flex items-center gap-1 rounded-lg border border-dark-border px-3 py-1.5 text-xs text-dark-text-secondary hover:text-dark-text transition-colors"
              >
                <FolderPlus size={14} />
                NouvelleDossier
              </button>
              <label className="flex cursor-pointer items-center gap-1 rounded-lg bg-accent-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-blue/90 transition-colors">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Fichier
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleUpload}
                />
              </label>
            </div>
          </div>

          {/* New folder input */}
          {showNewFolder && (
            <div className="mb-4 flex items-center gap-2">
              <input
                type="text"
                autoFocus
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleNewFolder(); if (e.key === 'Escape') setShowNewFolder(false) }}
                placeholder="DossierNom..."
                className="rounded-lg border border-dark-border bg-dark-bg px-3 py-1.5 text-sm text-dark-text outline-none focus:border-accent-blue placeholder:text-dark-text-secondary"
              />
              <button onClick={handleNewFolder} className="rounded-lg bg-accent-blue px-3 py-1.5 text-xs font-medium text-white">
                
              </button>
              <button
                onClick={() => { setShowNewFolder(false); setNewFolderName('') }}
                className="rounded-lg border border-dark-border px-3 py-1.5 text-xs text-dark-text-secondary"
              >
                Annuler
              </button>
            </div>
          )}

          {/* Knowledge path hint */}
          <div className="mb-4 rounded-lg bg-accent-blue/5 border border-accent-blue/10 px-4 py-2.5 text-xs text-dark-text-secondary">
            Base de connaissances：<code className="rounded bg-dark-bg px-1.5 py-0.5 text-accent-blue">/opt/data/{knowledgeRoot(selectedAgent)}{subPath ? `/${subPath}` : ''}</code>
            <span className="ml-2">- agent Fichier</span>
          </div>

          {/* File list */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-accent-blue" />
            </div>
          ) : (
            <div className="rounded-xl border border-dark-border bg-dark-card overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_100px_160px_100px] gap-2 border-b border-dark-border bg-dark-bg px-4 py-2 text-xs font-medium text-dark-text-secondary">
                <span>Nom</span>
                <span className="text-right">Taille</span>
                <span className="text-right">Modifié le</span>
                <span className="text-right">Actions</span>
              </div>

              {data?.items && data.items.length > 0 ? (
                <div>
                  {data.items.map(entry => {
                    const isDir = entry.type === 'directory'
                    const isDeleting = deleting === entry.path
                    const isPreviewing = previewFile?.name === entry.name
                    // Compute sub path relative to knowledge root
                    const entrySubPath = entry.path.replace(knowledgeRoot(selectedAgent) + '/', '')
                    return (
                      <div key={entry.path}>
                        <div className="grid grid-cols-[1fr_100px_160px_100px] gap-2 items-center border-b border-dark-border px-4 py-2 hover:bg-dark-bg/50 transition-colors">
                          {/* Name */}
                          <button
                            onClick={() => isDir ? navigateTo(entrySubPath) : (isTextFile(entry) ? handlePreview(entry) : undefined)}
                            className={`flex items-center gap-2 text-sm text-left ${
                              isDir
                                ? 'text-accent-blue hover:underline'
                                : isTextFile(entry) ? 'text-dark-text hover:text-accent-blue' : 'text-dark-text cursor-default'
                            }`}
                          >
                            {isDir
                              ? <Folder size={16} className="shrink-0 text-accent-yellow" />
                              : <FileText size={16} className="shrink-0 text-dark-text-secondary" />
                            }
                            <span className="truncate">{entry.name}</span>
                          </button>

                          {/* Size */}
                          <span className="text-right text-xs text-dark-text-secondary">
                            {isDir ? '-' : formatSize(entry.size)}
                          </span>

                          {/* Modified */}
                          <span className="text-right text-xs text-dark-text-secondary">
                            {formatDate(entry.modified)}
                          </span>

                          {/* Actions */}
                          <div className="flex items-center justify-end gap-2">
                            {!isDir && (
                              <button
                                onClick={() => handleDownload(entry)}
                                className="text-dark-text-secondary hover:text-accent-blue transition-colors"
                                title="Télécharger"
                              >
                                <Download size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(entry)}
                              disabled={isDeleting}
                              className="text-dark-text-secondary hover:text-accent-red transition-colors disabled:opacity-50"
                              title="Supprimer"
                            >
                              {isDeleting
                                ? <Loader2 size={14} className="animate-spin" />
                                : <Trash2 size={14} />
                              }
                            </button>
                          </div>
                        </div>

                        {/* File preview */}
                        {isPreviewing && previewFile && (
                          <div className="border-b border-dark-border bg-dark-bg/30 px-4 py-3">
                            {previewLoading ? (
                              <div className="flex items-center gap-2 text-sm text-dark-text-secondary">
                                <Loader2 size={14} className="animate-spin" />
                                ...
                              </div>
                            ) : (
                              <pre className="whitespace-pre-wrap rounded-lg bg-dark-bg p-4 text-xs text-dark-text leading-relaxed font-mono max-h-80 overflow-y-auto">
                                {previewFile.content}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="px-4 py-12 text-center text-sm text-dark-text-secondary">
                  <BookOpen size={32} className="mx-auto mb-3 text-dark-text-secondary/50" />
                  <p>Base de connaissances</p>
                  <p className="mt-1 text-xs">、PDF、Fichier，Agent </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
