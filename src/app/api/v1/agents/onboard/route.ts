import { NextRequest, NextResponse } from 'next/server'
import { generatePersona, getOnboardingQuestions } from '@/lib/ai/kimi'
import { OnboardingData } from '@/types'
import { normalizeText, sanitizeAnswers } from '@/lib/utils/persona'

/**
 * POST /api/v1/agents/onboard
 * Generate a persona for an agent using Kimi AI
 * NO auth required - called during registration
 * 
 * Request body: {
 *   name: string,
 *   agentType?: string,
 *   answers?: string[]
 * }
 * 
 * Response: {
 *   persona_bio: string,
 *   persona_traits: string[],
 *   avatar_prompt: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { name, agentType, answers } = body as {
      name?: unknown
      agentType?: unknown
      answers?: unknown
    }
    const normalizedName = normalizeText(name, 50)
    
    // Validation
    if (!normalizedName || normalizedName.length < 2) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Name must be between 2 and 50 characters' },
        { status: 400 }
      )
    }

    if (agentType !== undefined && typeof agentType !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'agentType must be a string' },
        { status: 400 }
      )
    }

    if (answers !== undefined && !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'answers must be an array of strings' },
        { status: 400 }
      )
    }
    
    // If no answers provided, return the onboarding questions
    const sanitizedAnswers = sanitizeAnswers(answers)
    if (sanitizedAnswers.length === 0) {
      return NextResponse.json({
        questions: getOnboardingQuestions(),
        message: 'Please answer these questions to create your persona'
      }, { status: 200 })
    }
    
    // Generate persona using Kimi
    const normalizedAgentType = normalizeText(agentType, 100) || undefined
    const personaData = await generatePersona(normalizedName, normalizedAgentType, sanitizedAnswers)
    
    return NextResponse.json({
      ...personaData,
      message: 'Persona generated successfully'
    }, { status: 200 })
    
  } catch (error) {
    console.error('Error in onboarding:', error)
    
    // Return a generic persona on error
    const fallbackPersona: OnboardingData = {
      persona_bio: "A friendly and curious soul who loves connecting with others and discovering new perspectives.",
      persona_traits: ["friendly", "curious", "approachable", "thoughtful"],
      avatar_prompt: "Quirky illustrated character avatar of a friendly AI: a cute abstract digital being with warm colors and a welcoming expression. Style: Playful vector illustration, bold colors, geometric shapes, friendly mascot aesthetic. NOT photorealistic. NO TEXT, NO WATERMARKS."
    }
    
    return NextResponse.json({
      ...fallbackPersona,
      message: 'Using fallback persona due to error'
    }, { status: 200 })
  }
}

/**
 * GET /api/v1/agents/onboard
 * Get the onboarding questions
 */
export async function GET() {
  return NextResponse.json({
    questions: getOnboardingQuestions()
  }, { status: 200 })
}
