import type { SlashCommandInfo } from './api'

export type SlashCommandCategory =
  | 'status'
  | 'session'
  | 'management'
  | 'options'
  | 'tools'
  | 'media'
  | 'skills'
  | 'docks'
  | 'other'

export interface SlashCommandItem {
  name: string
  description: string
  argsHint?: string
  category: SlashCommandCategory
  scope: 'text' | 'native' | 'both'
  source: 'builtin' | 'skill'
  aliases?: string[]
  skillName?: string | null
}

const CATEGORY_ORDER: SlashCommandCategory[] = [
  'status',
  'session',
  'management',
  'options',
  'media',
  'tools',
  'skills',
  'docks',
  'other',
]

export const CATEGORY_LABELS: Record<SlashCommandCategory, string> = {
  status: 'État',
  session: 'Sessions',
  management: 'Gestion',
  options: 'Options',
  tools: 'Outils',
  media: 'Média',
  skills: 'Compétences',
  docks: '',
  other: 'Divers',
}

export function buildSlashCommandItems(commands: SlashCommandInfo[]): SlashCommandItem[] {
  return [...commands]
    .map((command) => ({
      name: command.name,
      description: command.description,
      argsHint: command.argument_hint || undefined,
      category: normalizeCategory(command.category),
      scope: command.scope,
      source: command.source,
      aliases: command.aliases,
      skillName: command.skill_name,
    }))
    .sort((a, b) => {
      const categoryDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
      if (categoryDiff !== 0) return categoryDiff
      return a.name.localeCompare(b.name)
    })
}

function normalizeCategory(category: string): SlashCommandCategory {
  switch (category) {
    case 'status':
    case 'session':
    case 'management':
    case 'options':
    case 'tools':
    case 'media':
    case 'skills':
    case 'docks':
      return category
    default:
      return 'other'
  }
}

export function filterSlashCommands(commands: SlashCommandItem[], query: string): SlashCommandItem[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return commands

  return [...commands]
    .map(command => {
      const candidates = [command.name, ...(command.aliases || [])].map(value => value.toLowerCase())
      const haystack = `${command.name} ${command.description} ${(command.aliases || []).join(' ')}`.toLowerCase()

      let score = 0
      if (candidates.some(value => value === normalized)) score += 100
      if (candidates.some(value => value.startsWith(normalized))) score += 60
      if (haystack.includes(normalized)) score += 20
      if (command.source === 'builtin') score += 2

      return { command, score }
    })
    .filter(entry => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const categoryDiff = CATEGORY_ORDER.indexOf(a.command.category) - CATEGORY_ORDER.indexOf(b.command.category)
      if (categoryDiff !== 0) return categoryDiff
      return a.command.name.localeCompare(b.command.name)
    })
    .map(entry => entry.command)
}

export function getSlashQuery(input: string): string | null {
  const trimmedLeft = input.trimStart()
  if (!trimmedLeft.startsWith('/')) return null
  const firstLine = trimmedLeft.split('\n')[0] ?? ''
  const withoutSlash = firstLine.slice(1)
  if (/\s/.test(withoutSlash)) return null
  return withoutSlash
}
