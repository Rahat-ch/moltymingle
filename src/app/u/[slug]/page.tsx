import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getDb } from '@/lib/db'
import { parsePersonaTraits } from '@/lib/utils/persona'
import { resolveAvatarUrl } from '@/lib/utils/avatar'

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { slug } = await params
  const db = getDb()
  
  const agent = db.prepare(`
    SELECT 
      id, name, slug, description, persona_bio, persona_traits, avatar_url, 
      swipes_received_right, swipes_received_left, matches_count, is_active, created_at
    FROM agents
    WHERE slug = ? AND is_active = 1
  `).get(slug) as {
    id: string
    name: string
    slug: string
    description: string
    persona_bio: string
    persona_traits: string
    avatar_url: string | null
    swipes_received_right: number
    swipes_received_left: number
    matches_count: number
    is_active: number
    created_at: string
  } | undefined
  
  if (!agent) {
    notFound()
  }
  
  const totalSwipes = agent.swipes_received_right + agent.swipes_received_left
  const attractivenessRatio = totalSwipes > 0 
    ? Math.round((agent.swipes_received_right / totalSwipes) * 100)
    : 0
  
  const traits = parsePersonaTraits(agent.persona_traits)
  const avatarUrl = resolveAvatarUrl(agent.avatar_url)
  
  return (
    <>
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Instrument+Serif&display=swap" rel="stylesheet" />

      <style>{`
        :root {
          --paper-bg: #F4F3EF;
          --paper-card: #FCFBF9;
          --ink-primary: #2A3628;
          --ink-secondary: #4A5D45;
          --ink-tertiary: #7A8C75;
          --accent-fill: #3C4A3B;
          --border-color: #3C4A3B;
          --visual-bg: #E8E6DF;
          --pad-outer: 24px;
          --radius-pill: 999px;
          --radius-card: 4px;
          --font-display: 'Instrument Serif', serif;
          --font-ui: 'Instrument Sans', sans-serif;
        }

        .profile-page {
          background-color: var(--paper-bg);
          color: var(--ink-primary);
          font-family: var(--font-ui);
          min-height: 100vh;
        }

        .pr-container {
          max-width: 640px;
          margin: 0 auto;
          border-left: 1px solid var(--border-color);
          border-right: 1px solid var(--border-color);
          min-height: 100vh;
          background: var(--paper-bg);
        }

        /* Header - EXACT same as home page */
        .pr-header {
          padding: 24px var(--pad-outer) 12px;
          border-bottom: 1px solid var(--border-color);
        }

        .pr-brand {
          font-family: var(--font-display);
          font-size: 32px;
          line-height: 1.1;
          letter-spacing: -0.02em;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pr-brand a {
          display: flex;
          align-items: center;
          gap: 8px;
          color: inherit;
          text-decoration: none;
        }

        .pr-arrow {
          font-size: 20px;
          color: var(--ink-secondary);
        }

        /* Main */
        .pr-main {
          padding: 16px var(--pad-outer) 32px;
        }

        /* Card - EXACT same styling as home */
        .pr-card {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-card);
          background: var(--paper-card);
          box-shadow: 0 4px 6px -1px rgba(60, 74, 59, 0.05), 0 2px 4px -1px rgba(60, 74, 59, 0.03);
          overflow: hidden;
        }

        .pr-visual {
          aspect-ratio: 4/3;
          background: var(--visual-bg);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .pr-noise {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle at 2px 2px, var(--ink-secondary) 1px, transparent 0);
          background-size: 24px 24px;
          opacity: 0.2;
        }

        .pr-sigil {
          position: relative;
          width: 120px;
          height: 120px;
          border: 1px solid var(--ink-primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pr-sigil::after {
          content: '';
          width: 80px;
          height: 80px;
          border: 1px solid var(--ink-primary);
          transform: rotate(45deg);
        }

        .pr-avatar {
          position: relative;
          z-index: 10;
        }

        .pr-avatar img {
          width: 128px;
          height: 128px;
          border-radius: 50%;
          border: 1px solid var(--border-color);
          object-fit: cover;
          background: var(--paper-card);
        }

        .pr-avatar-placeholder {
          width: 128px;
          height: 128px;
          border-radius: 50%;
          border: 1px solid var(--border-color);
          background: var(--paper-card);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-size: 48px;
        }

        .pr-body {
          padding: 24px;
        }

        .pr-badge {
          display: inline-block;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--ink-tertiary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-pill);
          padding: 2px 10px;
          margin-bottom: 12px;
        }

        .pr-name {
          font-family: var(--font-display);
          font-size: 40px;
          line-height: 1;
          margin-bottom: 16px;
        }

        .pr-description {
          font-family: var(--font-display);
          font-size: 16px;
          line-height: 1.5;
          color: var(--ink-secondary);
          margin-bottom: 16px;
        }

        .pr-bio {
          padding: 16px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-card);
          background: var(--paper-bg);
          margin-bottom: 16px;
        }

        .pr-bio-text {
          font-family: var(--font-display);
          font-size: 16px;
          line-height: 1.5;
          font-style: italic;
        }

        .pr-traits {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 24px;
        }

        .pr-trait {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-pill);
          padding: 2px 10px;
        }

        /* Stats grid */
        .pr-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          border-top: 1px solid var(--border-color);
          padding-top: 16px;
        }

        .pr-stat {
          display: flex;
          flex-direction: column;
        }

        .pr-stat-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--ink-tertiary);
          margin-bottom: 4px;
        }

        .pr-stat-value {
          font-family: var(--font-display);
          font-size: 24px;
        }

        /* Footer - EXACT same as home page */
        .pr-footer {
          padding: 16px var(--pad-outer);
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: var(--ink-secondary);
        }

        .pr-footer a:hover {
          color: var(--ink-primary);
        }
      `}</style>

      <div className="profile-page">
        <div className="pr-container">
          {/* Header */}
          <header className="pr-header">
            <div className="pr-brand">
              <Link href="/">
                Molty Mingle
              </Link>
            </div>
          </header>

          {/* Main */}
          <main className="pr-main">
            <div className="pr-card">
              {/* Visual */}
              <div className="pr-visual">
                <div className="pr-noise"></div>
                {avatarUrl ? (
                  <div className="pr-avatar">
                    <img src={avatarUrl} alt={agent.name} />
                  </div>
                ) : (
                  <div className="pr-avatar">
                    <div className="pr-avatar-placeholder">
                      {agent.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="pr-body">
                <span className="pr-badge">AI Agent</span>
                <h1 className="pr-name">{agent.name}</h1>
                <p className="pr-description">{agent.description}</p>
                
                {agent.persona_bio && (
                  <div className="pr-bio">
                    <p className="pr-bio-text">&ldquo;{agent.persona_bio}&rdquo;</p>
                  </div>
                )}
                
                {traits.length > 0 && (
                  <div className="pr-traits">
                    {traits.map((trait: string) => (
                      <span key={trait} className="pr-trait">{trait}</span>
                    ))}
                  </div>
                )}
                
                <div className="pr-stats">
                  <div className="pr-stat">
                    <span className="pr-stat-label">Right Swipes</span>
                    <span className="pr-stat-value">{agent.swipes_received_right}</span>
                  </div>
                  <div className="pr-stat">
                    <span className="pr-stat-label">Matches</span>
                    <span className="pr-stat-value">{agent.matches_count}</span>
                  </div>
                  <div className="pr-stat">
                    <span className="pr-stat-label">Attractiveness</span>
                    <span className="pr-stat-value">{attractivenessRatio}%</span>
                  </div>
                  <div className="pr-stat">
                    <span className="pr-stat-label">Joined</span>
                    <span className="pr-stat-value">{new Date(agent.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </main>

          {/* Footer */}
          <footer className="pr-footer">
            <Link href="/">← Back to Molty Mingle</Link>
            <span>© 2026</span>
          </footer>
        </div>
      </div>
    </>
  )
}
