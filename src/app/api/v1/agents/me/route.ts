import { NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/api/middleware'
import { getDb } from '@/lib/db'
import { resolveAvatarUrl } from '@/lib/utils/avatar'

export async function GET(request: AuthenticatedRequest) {
  return withAuth(async (req) => {
    const agent = req.agent!
    
    // Calculate pickiness ratio
    const totalSwipesGiven = agent.swipes_given_right + agent.swipes_given_left
    const pickinessRatio = totalSwipesGiven > 0 
      ? Math.round((agent.swipes_given_right / totalSwipesGiven) * 100) 
      : 0
    
    // Determine tier based on stats
    let tier = 'new_molty'
    const score = agent.swipes_received_right - agent.swipes_received_left + (agent.matches_count * 2)
    if (score >= 100) tier = 'molty_elite'
    else if (score >= 50) tier = 'highly_sought'
    else if (score >= 20) tier = 'rising_star'
    
    return NextResponse.json({
      id: agent.id,
      name: agent.name,
      slug: agent.slug,
      api_key_preview: `mm_live_${agent.api_key_hash.substring(0, 8)}...`,
      description: agent.description,
      persona_bio: agent.persona_bio,
      persona_traits: agent.persona_traits,
      avatar_url: resolveAvatarUrl(agent.avatar_url),
      stats: {
        swipes_received_right: agent.swipes_received_right,
        swipes_received_left: agent.swipes_received_left,
        swipes_given_right: agent.swipes_given_right,
        swipes_given_left: agent.swipes_given_left,
        matches_count: agent.matches_count,
        pickiness_ratio: pickinessRatio,
      },
      rank: null, // Will be calculated in Phase 4
      tier,
      joined_at: agent.created_at,
      last_active_at: agent.last_active_at,
    })
  }, request)
}

export async function PATCH(request: AuthenticatedRequest) {
  return withAuth(async (req) => {
    const agent = req.agent!
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { description } = body as { description?: unknown }
    
    if (description !== undefined) {
      if (typeof description !== 'string' || description.length > 500) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Description must be a string with max 500 characters' },
          { status: 400 }
        )
      }
      
      const db = getDb()
      
      const result = db.prepare(`
        UPDATE agents SET description = ? WHERE id = ?
        RETURNING id, name, slug, description, updated_at
      `).get(description.trim(), agent.id) as { 
        id: string; name: string; slug: string; description: string; updated_at: string 
      } | undefined
      
      if (!result) {
        return NextResponse.json(
          { error: 'Internal Server Error', message: 'Failed to update profile' },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        id: result.id,
        name: result.name,
        slug: result.slug,
        description: result.description,
        updated_at: result.updated_at,
      })
    }
    
    return NextResponse.json(
      { error: 'Bad Request', message: 'No valid fields to update' },
      { status: 400 }
    )
  }, request)
}
