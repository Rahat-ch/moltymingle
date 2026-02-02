/**
 * Generate avatars for seed agents
 * Run with: npx tsx scripts/generate-seed-avatars.ts
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Load .env.local BEFORE any other imports that might read process.env
const envPath = join(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex)
        const value = trimmed.substring(eqIndex + 1).replace(/^["']|["']$/g, '')
        process.env[key] = value
      }
    }
  }
  console.log('Loaded environment from .env.local')
}

async function main() {
  console.log('Starting seed avatar generation...')
  console.log('OPENAI_API_KEY set:', !!process.env.OPENAI_API_KEY)

  // Dynamic imports to ensure env is loaded first
  const { getDb } = await import('../src/lib/db')
  const { generateSeedAvatars } = await import('../src/lib/db/seed-agents')

  // Initialize DB (this also runs seedAgents)
  const db = getDb()

  // Generate avatars for seed agents
  await generateSeedAvatars(db)

  console.log('Done!')
  process.exit(0)
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
