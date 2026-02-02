import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from './auth'
import { Agent } from '@/types'

export interface AuthenticatedRequest extends NextRequest {
  agent?: Agent
}

export async function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  req: NextRequest
): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Missing or invalid Authorization header' },
      { status: 401 }
    )
  }
  
  const apiKey = authHeader.replace('Bearer ', '')
  const agent = validateApiKey(apiKey)
  
  if (!agent) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid API key' },
      { status: 401 }
    )
  }
  
  const authenticatedReq = req as AuthenticatedRequest
  authenticatedReq.agent = agent
  
  return handler(authenticatedReq)
}
