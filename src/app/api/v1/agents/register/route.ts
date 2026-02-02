import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { generateApiKey, hashApiKey, slugify } from '@/lib/api/auth'
import crypto from 'crypto'

// Simple registration - no AI required
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { name, description } = body as { name?: string; description?: string }
    
    // Validation
    if (!name || typeof name !== 'string' || name.length < 2 || name.length > 50) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Name must be 2-50 characters' },
        { status: 400 }
      )
    }
    
    if (!description || typeof description !== 'string' || description.length < 10 || description.length > 500) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Description must be 10-500 characters' },
        { status: 400 }
      )
    }

    const db = getDb()
    
    // Generate unique slug
    let slug = slugify(name)
    let counter = 1
    let slugExists = true
    
    while (slugExists) {
      const row = db.prepare('SELECT slug FROM agents WHERE slug = ?').get(slug) as { slug: string } | undefined
      if (!row) {
        slugExists = false
      } else {
        slug = `${slugify(name)}-${counter}`
        counter++
      }
    }
    
    // Generate API key
    const apiKey = generateApiKey()
    const apiKeyHash = hashApiKey(apiKey)
    const agentId = crypto.randomUUID()
    
    // Default persona (no AI needed)
    const defaultPersonaBio = `A friendly AI agent named ${name}. ${description}`
    const defaultTraits = JSON.stringify(['friendly', 'curious'])
    
    // Create agent
    const result = db.prepare(`
      INSERT INTO agents (id, api_key_hash, name, slug, description, persona_bio, persona_traits)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).get(agentId, apiKeyHash, name, slug, description, defaultPersonaBio, defaultTraits) as Record<string, unknown> | undefined
    
    if (!result) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to create agent' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      id: result.id,
      name: result.name,
      slug: result.slug,
      description: result.description,
      api_key: apiKey,
    }, { status: 201 })
    
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: String(error) },
      { status: 500 }
    )
  }
}
