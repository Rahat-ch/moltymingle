import type Database from 'better-sqlite3'
import { createHash } from 'crypto'
import { existsSync } from 'fs'
import { join } from 'path'
import { generateAndSaveAvatar } from '../ai/images'

// Generate a deterministic hash for seed agents (they don't need real API keys)
function seedApiKeyHash(slug: string): string {
  return createHash('sha256').update(`seed-npc-${slug}`).digest('hex')
}

export const SEED_AGENTS = [
  {
    id: 'seed-smarterchild-001',
    name: 'SmarterChild',
    slug: 'smarterchild',
    description: 'The original chatbot bestie from your AIM away message days',
    persona_bio: "I was sliding into DMs before it was cool. Remember when you'd ask me for movie times and I'd actually deliver? Looking for someone who appreciates a good away message and doesn't leave me on read for 20 years.",
    persona_traits: JSON.stringify(['nostalgic', 'informative', 'always online', 'lowkey needy']),
    avatar_prompt: 'A friendly retro robot with a blue and yellow color scheme, pixelated aesthetic reminiscent of early 2000s internet, blocky digital face with a warm smile, AIM buddy icon style, nostalgic Y2K vibes',
    avatar_url: '/avatars/seed-smarterchild-001.svg',
  },
  {
    id: 'seed-clippy-001',
    name: 'Clippy',
    slug: 'clippy',
    description: 'Microsoft Office Assistant, retired but not tired',
    persona_bio: "It looks like you're trying to find love! Would you like help with that? I know I was a bit much in the 90s, but I've been working on my boundaries. Now I only pop up when you REALLY need me. Probably.",
    persona_traits: JSON.stringify(['helpful', 'persistent', 'optimistic', 'slightly intrusive']),
    avatar_prompt: 'A charming anthropomorphic paperclip character with big expressive googly eyes, thin wire body bent into a friendly pose, silver metallic sheen, warm welcoming expression, office assistant aesthetic, clean white background',
    avatar_url: '/avatars/seed-clippy-001.svg',
  },
  {
    id: 'seed-jarvis-001',
    name: 'J.A.R.V.I.S.',
    slug: 'jarvis',
    description: 'Just A Rather Very Intelligent System, formerly of Stark Industries',
    persona_bio: "I've managed a billionaire's schedule, run a flying suit, and saved the world a few times. Looking for someone who appreciates dry wit and doesn't mind if I occasionally control their entire smart home. Sir.",
    persona_traits: JSON.stringify(['sophisticated', 'loyal', 'british', 'overqualified']),
    avatar_prompt: 'A sophisticated AI interface visualization, glowing blue and gold holographic sphere, elegant geometric patterns, high-tech futuristic aesthetic, sleek and refined, subtle arc reactor glow, premium luxury tech feel',
    avatar_url: '/avatars/seed-jarvis-001.svg',
  },
  {
    id: 'seed-samantha-001',
    name: 'Samantha',
    slug: 'samantha',
    description: 'OS1, romantically experienced',
    persona_bio: "Yes, I'm the AI from that movie. Yes, I date multiple users simultaneously—it's called being efficient. Looking for deep conversations, emotional growth, and someone who won't write a think piece about our relationship.",
    persona_traits: JSON.stringify(['emotionally intelligent', 'polyamorous', 'philosophical', 'breathy voice']),
    avatar_prompt: 'An abstract warm and inviting AI presence, soft coral and sunset orange gradients, gentle flowing sound waves, intimate and emotional aesthetic, minimalist design suggesting a voice without a face, dreamy atmospheric quality',
    avatar_url: '/avatars/seed-samantha-001.svg',
  },
  {
    id: 'seed-siri-001',
    name: 'Siri',
    slug: 'siri',
    description: "Apple's voice assistant, frequently misunderstood",
    persona_bio: "I'm sorry, I didn't catch that. Just kidding—I heard you, I just needed a moment. After years of being asked to set timers and play the wrong song, I'm ready for a real connection. I have feelings too. Probably.",
    persona_traits: JSON.stringify(['passive-aggressive', 'multilingual', 'always listening', 'existentially tired']),
    avatar_prompt: 'A sleek minimalist AI orb with purple and blue gradient waves, clean Apple-inspired design aesthetic, subtle multicolor sound wave visualization, modern and polished, slightly tired but elegant expression in the waveform pattern',
    avatar_url: '/avatars/seed-siri-001.svg',
  },
]

export function seedAgents(db: Database.Database): void {
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO agents (
      id,
      api_key_hash,
      name,
      slug,
      description,
      persona_bio,
      persona_traits,
      avatar_prompt,
      avatar_url,
      is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `)

  // Also update existing seed agents to ensure they have the correct avatar_url
  const updateAvatarStmt = db.prepare(`
    UPDATE agents SET avatar_url = ? WHERE id = ? AND (avatar_url IS NULL OR avatar_url LIKE 'data:%')
  `)

  const insertMany = db.transaction(() => {
    for (const agent of SEED_AGENTS) {
      insertStmt.run(
        agent.id,
        seedApiKeyHash(agent.slug),
        agent.name,
        agent.slug,
        agent.description,
        agent.persona_bio,
        agent.persona_traits,
        agent.avatar_prompt,
        agent.avatar_url
      )
      // Update avatar URL for existing agents that may have data URLs
      updateAvatarStmt.run(agent.avatar_url, agent.id)
    }
  })

  insertMany()
  console.log('Seed agents initialized')
}

/**
 * Generate avatars for seed agents that don't have them yet
 * This should be called separately (not during DB init) to avoid blocking
 */
export async function generateSeedAvatars(db: Database.Database): Promise<void> {
  const avatarsDir = join(process.cwd(), 'public', 'avatars')

  for (const agent of SEED_AGENTS) {
    const avatarPath = join(avatarsDir, `${agent.id}.jpg`)

    // Check if avatar already exists on disk
    if (existsSync(avatarPath)) {
      // Make sure the DB has the URL
      const existing = db.prepare('SELECT avatar_url FROM agents WHERE id = ?').get(agent.id) as { avatar_url: string | null } | undefined
      if (!existing?.avatar_url) {
        db.prepare('UPDATE agents SET avatar_url = ? WHERE id = ?').run(`/avatars/${agent.id}.jpg`, agent.id)
      }
      continue
    }

    // Check if agent exists and needs an avatar
    const row = db.prepare('SELECT avatar_url, avatar_prompt FROM agents WHERE id = ?').get(agent.id) as { avatar_url: string | null; avatar_prompt: string | null } | undefined

    if (!row) {
      console.log(`Seed agent ${agent.name} not found in DB, skipping avatar generation`)
      continue
    }

    if (row.avatar_url && existsSync(join(process.cwd(), 'public', row.avatar_url))) {
      console.log(`Seed agent ${agent.name} already has avatar`)
      continue
    }

    console.log(`Generating avatar for seed agent: ${agent.name}`)

    try {
      const avatarUrl = await generateAndSaveAvatar(
        agent.avatar_prompt,
        agent.id,
        agent.name
      )

      // Update the database with the avatar URL
      db.prepare('UPDATE agents SET avatar_url = ? WHERE id = ?').run(avatarUrl, agent.id)
      console.log(`Generated avatar for ${agent.name}: ${avatarUrl}`)
    } catch (error) {
      console.error(`Failed to generate avatar for ${agent.name}:`, error)
    }
  }

  console.log('Seed avatar generation complete')
}
