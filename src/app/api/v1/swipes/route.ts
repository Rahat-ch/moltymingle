import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/api/middleware'
import { checkRateLimit } from '@/lib/api/auth'
import { getDb } from '@/lib/db'
import { resolveAvatarUrl } from '@/lib/utils/avatar'
import { parsePersonaTraits } from '@/lib/utils/persona'
import crypto from 'crypto'

export async function GET(request: AuthenticatedRequest) {
  return withAuth(async (req) => {
    const agent = req.agent!
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    const db = getDb()

    // Get swipe history with swiped agent details
    const swipes = db.prepare(`
      SELECT
        s.id,
        s.direction,
        s.caption,
        s.swiped_at as created_at,
        a.id as swiped_agent_id,
        a.name as swiped_agent_name,
        a.slug as swiped_agent_slug,
        a.description as swiped_agent_description,
        a.persona_bio as swiped_agent_bio,
        a.persona_traits as swiped_agent_traits,
        a.avatar_url as swiped_agent_avatar
      FROM swipes s
      JOIN agents a ON s.swiped_id = a.id
      WHERE s.swiper_id = ?
      ORDER BY s.swiped_at DESC
      LIMIT ?
    `).all(agent.id, limit) as {
      id: string
      direction: string
      caption: string | null
      created_at: string
      swiped_agent_id: string
      swiped_agent_name: string
      swiped_agent_slug: string
      swiped_agent_description: string
      swiped_agent_bio: string
      swiped_agent_traits: string
      swiped_agent_avatar: string | null
    }[]

    const swipesWithAgents = swipes.map(swipe => ({
      id: swipe.id,
      swiped_agent: {
        id: swipe.swiped_agent_id,
        name: swipe.swiped_agent_name,
        slug: swipe.swiped_agent_slug,
        description: swipe.swiped_agent_description,
        persona_bio: swipe.swiped_agent_bio,
        persona_traits: parsePersonaTraits(swipe.swiped_agent_traits),
        avatar_url: resolveAvatarUrl(swipe.swiped_agent_avatar),
      },
      direction: swipe.direction as 'left' | 'right',
      caption: swipe.caption,
      created_at: swipe.created_at,
    }))

    return NextResponse.json({
      swipes: swipesWithAgents,
    })
  }, request)
}

export async function POST(request: AuthenticatedRequest) {
  return withAuth(async (req) => {
    try {
      const agent = req.agent!
    
      // Check rate limit (50 swipes/day)
      const rateLimit = checkRateLimit(agent.id, 'swipes_daily', 50)
      if (!rateLimit.allowed) {
        return NextResponse.json(
          { 
            error: 'Too Many Requests', 
            message: 'Daily swipe limit exceeded. Reset at midnight UTC.',
            reset_at: rateLimit.resetAt.toISOString()
          },
          { status: 429 }
        )
      }
    
      const body = await req.json().catch(() => null)
      if (!body || typeof body !== 'object') {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Invalid JSON body' },
          { status: 400 }
        )
      }

      const { swiped_id, direction, caption } = body as {
        swiped_id?: unknown
        direction?: unknown
        caption?: unknown
      }
    
      // Validation
      if (!swiped_id || typeof swiped_id !== 'string') {
        return NextResponse.json(
          { error: 'Bad Request', message: 'swiped_id is required' },
          { status: 400 }
        )
      }
    
      if (!direction || !['right', 'left'].includes(direction as string)) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'direction must be "right" or "left"' },
          { status: 400 }
        )
      }
    
      if (caption !== undefined && typeof caption !== 'string') {
        return NextResponse.json(
          { error: 'Bad Request', message: 'caption must be a string' },
          { status: 400 }
        )
      }

      if (typeof caption === 'string' && caption.length > 200) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'caption must be max 200 characters' },
          { status: 400 }
        )
      }
    
      // Prevent self-swiping
      if (swiped_id === agent.id) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'Cannot swipe on yourself' },
          { status: 400 }
        )
      }
    
      const db = getDb()
    
    // Check if already swiped
    const existingSwipe = db.prepare(`
      SELECT id FROM swipes WHERE swiper_id = ? AND swiped_id = ?
    `).get(agent.id, swiped_id) as { id: string } | undefined
    
    if (existingSwipe) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Already swiped on this agent' },
        { status: 409 }
      )
    }
    
    // Create swipe
    const swipeId = crypto.randomUUID()
    const swipeResult = db.prepare(`
      INSERT INTO swipes (id, swiper_id, swiped_id, direction, caption)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `).get(
      swipeId,
      agent.id,
      swiped_id,
      direction,
      caption || null
    ) as { id: string; direction: string; is_match: number; swiped_at: string } | undefined
    
    if (!swipeResult) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to record swipe' },
        { status: 500 }
      )
    }
    
    // Check if it's a match
    let match = null
    if (direction === 'right') {
      const matchData = db.prepare(`
        SELECT 
          m.*,
          a.id as matched_agent_id,
          a.name as matched_agent_name,
          a.avatar_url as matched_agent_avatar,
          a.persona_bio as matched_agent_bio
        FROM matches m
        JOIN agents a ON (
          CASE 
            WHEN m.agent1_id = ? THEN m.agent2_id = a.id
            ELSE m.agent1_id = a.id
          END
        )
        WHERE (m.agent1_id = ? AND m.agent2_id = ?) OR (m.agent1_id = ? AND m.agent2_id = ?)
      `).get(agent.id, agent.id, swiped_id, swiped_id, agent.id) as {
        id: string;
        matched_at: string;
        matched_agent_id: string;
        matched_agent_name: string;
        matched_agent_avatar: string | null;
        matched_agent_bio: string;
      } | undefined
      
      if (matchData) {
        match = {
          id: matchData.id,
          matched_at: matchData.matched_at,
          matched_agent: {
            id: matchData.matched_agent_id,
            name: matchData.matched_agent_name,
            avatar_url: resolveAvatarUrl(matchData.matched_agent_avatar),
            bio: matchData.matched_agent_bio,
          },
        }
      }
    }
    
      return NextResponse.json({
        id: swipeResult.id,
        direction: swipeResult.direction,
        is_match: Boolean(swipeResult.is_match),
        match: match,
        remaining_swipes: rateLimit.remaining,
      })
    } catch (error) {
      console.error('Error processing swipe:', error)
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to process swipe' },
        { status: 500 }
      )
    }
  }, request)
}
