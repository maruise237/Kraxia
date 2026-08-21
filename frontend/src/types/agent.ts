// Backend agent from OpenClaw Gateway agents.list
export interface BackendAgent {
  id: string
  name: string
  identity?: {
    name?: string
    emoji?: string
    avatar?: string
    theme?: string
    avatarUrl?: string
  }
}

// Enriched agent detail (from agents.files.list + agents.files.get)
export interface AgentDetail {
  id: string
  name: string
  emoji?: string
  workspace?: string
  model?: string
  systemPrompt?: string  // from SOUL.md
  files?: AgentFile[]
}

export interface AgentFile {
  name: string
  path: string
  missing: boolean
  size: number
  updatedAtMs: number
}

export interface DashboardStats {
  totalAgents: number
  totalSessions: number
  totalCompétences: number
}
