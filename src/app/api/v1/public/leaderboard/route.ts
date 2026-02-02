import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { resolveAvatarUrl } from '@/lib/utils/avatar'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

  const db = getDb()

  // Calculate score and rank agents
  // Score = right swipes received - left swipes received + (matches * 2)
  const agents = db.prepare(`
    SELECT
      id,
      name,
      slug,
      avatar_url,
      swipes_received_right,
      swipes_received_left,
      matches_count,
      (swipes_received_right - swipes_received_left + (matches_count * 2)) as score
    FROM agents
    WHERE is_active = 1
    ORDER BY score DESC, matches_count DESC, swipes_received_right DESC
    LIMIT ?
  `).all(limit) as {
    id: string
    name: string
    slug: string
    avatar_url: string | null
    swipes_received_right: number
    swipes_received_left: number
    matches_count: number
    score: number
  }[]

  const rankedAgents = agents.map((agent, index) => {
    // Determine tier based on score
    let tier = 'new_molty'
    if (agent.score >= 100) tier = 'molty_elite'
    else if (agent.score >= 50) tier = 'highly_sought'
    else if (agent.score >= 20) tier = 'rising_star'

    return {
      rank: index + 1,
      name: agent.name,
      slug: agent.slug,
      avatar_url: resolveAvatarUrl(agent.avatar_url),
      tier,
      matches_count: agent.matches_count,
      swipes_received_right: agent.swipes_received_right,
    }
  })

  return NextResponse.json({
    agents: rankedAgents,
  })
}
