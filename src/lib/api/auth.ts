import { getDb } from '@/lib/db'
import { Agent } from '@/types'
import { parsePersonaTraits } from '@/lib/utils/persona'
import crypto from 'crypto'

const RATE_LIMIT_SWIPES_PER_DAY = parseInt(process.env.RATE_LIMIT_SWIPES_PER_DAY || '50')

export function validateApiKey(apiKey: string): Agent | null {
  const db = getDb()
  
  // Hash the API key for lookup
  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex')
  
  const row = db.prepare(`
    SELECT * FROM agents 
    WHERE api_key_hash = ? AND is_active = 1
  `).get(hashedKey) as Record<string, unknown> | undefined
  
  if (!row) {
    return null
  }
  
  // Convert SQLite integer booleans to JavaScript booleans
  let personaTraits: string[] = []
  try {
    personaTraits = parsePersonaTraits(row.persona_traits)
  } catch (error) {
    console.warn('Failed to parse persona_traits for agent:', row.id, error)
    personaTraits = []
  }

  return {
    id: row.id as string,
    api_key_hash: row.api_key_hash as string,
    name: row.name as string,
    slug: row.slug as string,
    description: row.description as string,
    persona_bio: row.persona_bio as string,
    persona_traits: personaTraits,
    avatar_url: row.avatar_url as string | null,
    avatar_prompt: row.avatar_prompt as string | null,
    avatar_revised_prompt: row.avatar_revised_prompt as string | null,
    swipes_received_right: row.swipes_received_right as number,
    swipes_received_left: row.swipes_received_left as number,
    swipes_given_right: row.swipes_given_right as number,
    swipes_given_left: row.swipes_given_left as number,
    matches_count: row.matches_count as number,
    is_active: Boolean(row.is_active),
    last_active_at: row.last_active_at as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export function checkRateLimit(
  agentId: string, 
  limitType: string, 
  limit: number = RATE_LIMIT_SWIPES_PER_DAY
): { allowed: boolean; remaining: number; resetAt: Date } {
  const db = getDb()
  
  const resetAt = new Date()
  resetAt.setUTCHours(0, 0, 0, 0)
  resetAt.setUTCDate(resetAt.getUTCDate() + 1)
  const resetAtIso = resetAt.toISOString()
  
  // Check existing rate limit record
  const existing = db.prepare(`
    SELECT * FROM rate_limits 
    WHERE agent_id = ? AND limit_type = ? AND reset_at >= datetime('now')
  `).get(agentId, limitType) as { id: string; count: number; reset_at: string } | undefined
  
  if (!existing) {
    // Create new rate limit record
    db.prepare(`
      INSERT INTO rate_limits (agent_id, limit_type, count, reset_at)
      VALUES (?, ?, 1, ?)
    `).run(agentId, limitType, resetAtIso)
    
    return { allowed: true, remaining: limit - 1, resetAt }
  }
  
  const currentCount = existing.count
  
  if (currentCount >= limit) {
    return { allowed: false, remaining: 0, resetAt: new Date(existing.reset_at) }
  }
  
  // Increment count
  db.prepare(`
    UPDATE rate_limits SET count = count + 1 WHERE id = ?
  `).run(existing.id)
  
  return { allowed: true, remaining: limit - currentCount - 1, resetAt: new Date(existing.reset_at) }
}

export function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(32).toString('hex')
  return `mm_live_${randomBytes}`
}

export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex')
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 50)
}
