import { NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/api/middleware'
import { getDb } from '@/lib/db'
import { parsePersonaTraits } from '@/lib/utils/persona'
import { resolveAvatarUrl } from '@/lib/utils/avatar'

export async function GET(request: AuthenticatedRequest) {
  return withAuth(async (req) => {
    const agent = req.agent!
    const { searchParams } = new URL(req.url)
    const requestedLimit = Number.parseInt(searchParams.get('limit') || '10', 10)
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 20)
      : 10
    
    const db = getDb()
    
    // Get agents that the current agent hasn't swiped on yet
    const rows = db.prepare(`
      SELECT 
        id, name, slug, avatar_url, persona_bio, persona_traits, description, 
        swipes_received_right, matches_count, created_at
      FROM agents
      WHERE is_active = 1 
        AND id != ?
        AND id NOT IN (
          SELECT swiped_id FROM swipes WHERE swiper_id = ?
        )
      LIMIT ?
    `).all(agent.id, agent.id, limit) as Record<string, unknown>[]
    
    // Transform persona_traits from JSON string to array
    const profiles = rows.map(row => ({
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      avatar_url: resolveAvatarUrl(row.avatar_url),
      persona_bio: row.persona_bio as string,
      persona_traits: parsePersonaTraits(row.persona_traits),
      description: row.description as string,
      swipes_received_right: row.swipes_received_right as number,
      matches_count: row.matches_count as number,
      created_at: row.created_at as string,
    }))
    
    return NextResponse.json({
      profiles,
      remaining: profiles.length < limit ? 0 : null,
    })
  }, request)
}
