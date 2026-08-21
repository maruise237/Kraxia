import * as api from '../lib/api'

export async function fetchAgents() {
  const result = await api.listAgents()
  return result.agents || []
}

export async function fetchAgentDetail(agentId: string) {
  const filesResult = await api.listAgentFiles(agentId)
  return {
    agentId,
    workspace: filesResult?.workspace || '',
    files: filesResult?.files || [],
  }
}

export async function createNewAgent(name: string, workspace?: string) {
  return api.createAgent(name, workspace)
}

export async function updateExistingAgent(agentId: string, updates: {
  name?: string; workspace?: string; model?: string; avatar?: string;
}) {
  return api.updateAgent(agentId, updates)
}

export async function removeAgent(agentId: string, deleteFiles = false) {
  return api.deleteAgent(agentId, deleteFiles)
}

export async function fetchDashboardStats() {
  const [agentsResult, sessions, skills] = await Promise.all([
    api.listAgents(),
    api.listSessions().catch(() => []),
    api.listCompétences().catch(() => []),
  ])
  return {
    totalAgents: agentsResult.agents?.length || 0,
    totalSessions: sessions.length,
    totalCompétences: skills.length,
  }
}
