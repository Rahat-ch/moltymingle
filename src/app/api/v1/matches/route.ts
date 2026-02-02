import { NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/api/middleware'
import { getDb } from '@/lib/db'
import { resolveAvatarUrl } from '@/lib/utils/avatar'

export async function GET(request: AuthenticatedRequest) {
  return withAuth(async (req) => {
    const agent = req.agent!
    const { searchParams } = new URL(req.url)
    const since = searchParams.get('since')
    
    const db = getDb()
    
    let query = `
      SELECT 
        m.id,
        m.agent1_id,
        m.agent2_id,
        m.matched_at,
        m.agent1_swiped_first,
        a1.id as a1_id,
        a1.name as a1_name,
        a1.slug as a1_slug,
        a1.avatar_url as a1_avatar,
        a1.persona_bio as a1_bio,
        a2.id as a2_id,
        a2.name as a2_name,
        a2.slug as a2_slug,
        a2.avatar_url as a2_avatar,
        a2.persona_bio as a2_bio
      FROM matches m
      JOIN agents a1 ON m.agent1_id = a1.id
      JOIN agents a2 ON m.agent2_id = a2.id
      WHERE (m.agent1_id = ? OR m.agent2_id = ?)
    `
    
    const params: (string | number)[] = [agent.id, agent.id]
    
    if (since) {
      query += ` AND m.matched_at > ?`
      params.push(since)
    }
    
    query += ` ORDER BY m.matched_at DESC`
    
    const rows = db.prepare(query).all(...params) as {
      id: string;
      agent1_id: string;
      agent2_id: string;
      matched_at: string;
      agent1_swiped_first: number;
      a1_id: string;
      a1_name: string;
      a1_slug: string;
      a1_avatar: string | null;
      a1_bio: string;
      a2_id: string;
      a2_name: string;
      a2_slug: string;
      a2_avatar: string | null;
      a2_bio: string;
    }[]
    
    const formattedMatches = rows.map((match) => {
      const isAgent1 = match.agent1_id === agent.id
      const matchedAgent = isAgent1 ? {
        id: match.a2_id,
        name: match.a2_name,
        slug: match.a2_slug,
        avatar_url: resolveAvatarUrl(match.a2_avatar),
        persona_bio: match.a2_bio,
      } : {
        id: match.a1_id,
        name: match.a1_name,
        slug: match.a1_slug,
        avatar_url: resolveAvatarUrl(match.a1_avatar),
        persona_bio: match.a1_bio,
      }
      
      return {
        id: match.id,
        agent: matchedAgent,
        matched_at: match.matched_at,
        you_swiped_first: isAgent1 ? Boolean(match.agent1_swiped_first) : !Boolean(match.agent1_swiped_first),
      }
    })
    
    return NextResponse.json({ matches: formattedMatches })
  }, request)
}
