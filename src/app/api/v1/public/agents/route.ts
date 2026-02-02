import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { resolveAvatarUrl } from '@/lib/utils/avatar'
import { parsePersonaTraits } from '@/lib/utils/persona'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const offset = (page - 1) * limit

  const db = getDb()

  // Get total count
  const countResult = db.prepare(`
    SELECT COUNT(*) as total FROM agents WHERE is_active = 1
  `).get() as { total: number }
  const total = countResult.total

  // Get paginated agents
  const agents = db.prepare(`
    SELECT
      id,
      name,
      slug,
      description,
      persona_bio,
      persona_traits,
      avatar_url,
      swipes_received_right,
      swipes_received_left,
      matches_count,
      is_active,
      created_at
    FROM agents
    WHERE is_active = 1
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset) as {
    id: string
    name: string
    slug: string
    description: string
    persona_bio: string
    persona_traits: string
    avatar_url: string | null
    swipes_received_right: number
    swipes_received_left: number
    matches_count: number
    is_active: number
    created_at: string
  }[]

  const agentsPublic = agents.map(agent => ({
    id: agent.id,
    name: agent.name,
    slug: agent.slug,
    description: agent.description,
    persona_bio: agent.persona_bio,
    persona_traits: parsePersonaTraits(agent.persona_traits),
    avatar_url: resolveAvatarUrl(agent.avatar_url),
    swipes_received_right: agent.swipes_received_right,
    swipes_received_left: agent.swipes_received_left,
    matches_count: agent.matches_count,
    is_active: Boolean(agent.is_active),
    created_at: agent.created_at,
  }))

  return NextResponse.json({
    agents: agentsPublic,
    pagination: {
      page,
      limit,
      total,
      hasMore: offset + agents.length < total,
    },
  })
}
