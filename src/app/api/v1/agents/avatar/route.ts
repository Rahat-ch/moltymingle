import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthenticatedRequest } from '@/lib/api/middleware'
import { generateAndSaveAvatar } from '@/lib/ai/images'
import { getDb } from '@/lib/db'
import { normalizeText } from '@/lib/utils/persona'

/**
 * POST /api/v1/agents/avatar
 * Generate an avatar for the authenticated agent
 * Auth required
 * 
 * Request body: {
 *   avatar_prompt?: string  // Optional, uses stored prompt if not provided
 * }
 * 
 * Response: {
 *   avatar_url: string
 * }
 */
async function handleAvatarGeneration(req: AuthenticatedRequest): Promise<NextResponse> {
  try {
    const agent = req.agent!
    const body = await req.json().catch(() => ({}))
    if (body && typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { avatar_prompt } = body as { avatar_prompt?: unknown }
    
    // Use provided prompt or fall back to stored prompt
    let promptToUse = typeof avatar_prompt === 'string' ? avatar_prompt.trim() : ''
    if (avatar_prompt !== undefined && !promptToUse) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'avatar_prompt must be a non-empty string' },
        { status: 400 }
      )
    }
    
    if (!promptToUse) {
      // Get stored avatar_prompt from database
      const db = getDb()
      const row = db.prepare('SELECT avatar_prompt, name FROM agents WHERE id = ?').get(agent.id) as { avatar_prompt: string | null; name: string } | undefined
      
      if (!row?.avatar_prompt) {
        return NextResponse.json(
          { error: 'Bad Request', message: 'No avatar prompt provided or stored' },
          { status: 400 }
        )
      }
      
      promptToUse = row.avatar_prompt
    }

    const normalizedPrompt = normalizeText(promptToUse, 500)
    if (!normalizedPrompt) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'avatar_prompt must be a non-empty string' },
        { status: 400 }
      )
    }
    
    // Generate and save the avatar
    const avatarUrl = await generateAndSaveAvatar(normalizedPrompt, agent.id, agent.name)
    
    // Update agent record with avatar_url
    const db = getDb()
    db.prepare("UPDATE agents SET avatar_url = ?, updated_at = datetime('now') WHERE id = ?").run(avatarUrl, agent.id)
    
    return NextResponse.json({
      avatar_url: avatarUrl,
      message: 'Avatar generated successfully'
    }, { status: 200 })
    
  } catch (error) {
    console.error('Error generating avatar:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to generate avatar' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return withAuth(handleAvatarGeneration, request)
}

/**
 * GET /api/v1/agents/avatar
 * Get the current avatar status for the authenticated agent
 * Auth required
 */
async function handleGetAvatar(req: AuthenticatedRequest): Promise<NextResponse> {
  try {
    const agent = req.agent!
    
    const db = getDb()
    const row = db.prepare('SELECT avatar_url, avatar_prompt FROM agents WHERE id = ?').get(agent.id) as { avatar_url: string | null; avatar_prompt: string | null } | undefined
    
    return NextResponse.json({
      avatar_url: row?.avatar_url || null,
      avatar_prompt: row?.avatar_prompt || null,
      has_avatar: !!row?.avatar_url
    }, { status: 200 })
    
  } catch (error) {
    console.error('Error fetching avatar:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch avatar info' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return withAuth(handleGetAvatar, request)
}
