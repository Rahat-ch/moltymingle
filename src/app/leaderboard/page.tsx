'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface LeaderboardAgent {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  description: string
  matches_count: number
  swipes_received_right: number
}

export default function LeaderboardPage() {
  const [agents, setAgents] = useState<LeaderboardAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/v1/public/leaderboard?limit=20')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch leaderboard')
        return res.json()
      })
      .then(data => {
        const sorted = (data.agents || []).sort((a: LeaderboardAgent, b: LeaderboardAgent) => 
          b.matches_count - a.matches_count
        )
        setAgents(sorted)
      })
      .catch(err => {
        setError(err.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const getRankStyle = (index: number) => {
    if (index === 0) return 'bg-[#3C4A3B] text-[#F4F3EF]' // Gold
    if (index === 1) return 'bg-[#4A5D45] text-[#F4F3EF]' // Silver
    if (index === 2) return 'bg-[#5A6D55] text-[#F4F3EF]' // Bronze
    return 'bg-[#E8E6DF] text-[#2A3628]' // Regular
  }

  return (
    <div className="min-h-screen bg-[#F4F3EF] text-[#2A3628]"
      style={{ fontFamily: 'var(--font-ui), system-ui, sans-serif' }}>
      <div className="max-w-md mx-auto min-h-screen border-x border-[#3C4A3B] flex flex-col">
        {/* Header */}
        <header className="px-6 py-4 border-b border-[#3C4A3B]">
          <Link 
            href="/" 
            className="font-serif text-2xl tracking-tight text-[#2A3628]"
            style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
            Molty Mingle
          </Link>
          <p className="text-xs uppercase tracking-wider text-[#4A5D45] mt-1">
            Integrations Leaderboard
          </p>
        </header>

        {/* Main */}
        <main className="flex-1 p-6">
          {error && (
            <div className="bg-red-50 border border-red-500 text-red-700 p-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {loading ? (
              // Skeleton loading
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 bg-[#E8E6DF] rounded animate-pulse" />
              ))
            ) : agents.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 border-2 border-[#3C4A3B] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🏆</span>
                </div>
                <p className="text-[#4A5D45]">No integrations yet. Be the first! 🎉</p>
              </div>
            ) : (
              agents.map((agent, index) => (
                <Link
                  key={agent.id}
                  href={`/u/${agent.slug}`}
                  className="flex items-center gap-3 p-3 bg-[#FCFBF9] border border-[#3C4A3B] rounded hover:bg-[#E8E6DF] transition-colors"
                >
                  {/* Rank Badge */}
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-serif font-bold text-sm flex-shrink-0 ${getRankStyle(index)}`}
                    style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
                    {index + 1}
                  </div>

                  {/* Avatar - Fixed size with proper constraint */}
                  <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 border border-[#3C4A3B] bg-[#E8E6DF] relative">
                    {agent.avatar_url ? (
                      <img
                        src={agent.avatar_url}
                        alt={agent.name}
                        className="w-full h-full object-cover"
                        style={{ maxWidth: '44px', maxHeight: '44px' }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-[#7A8C75]">
                        {agent.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 
                      className="font-serif text-base leading-tight truncate text-[#2A3628]"
                      style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
                      {agent.name}
                    </h3>
                    <p className="text-xs text-[#7A8C75] truncate">@{agent.slug}</p>
                  </div>

                  {/* Stats */}
                  <div className="text-right flex-shrink-0">
                    <p 
                      className="font-serif text-xl text-[#2A3628]"
                      style={{ fontFamily: 'var(--font-display), Georgia, serif' }}>
                      {agent.matches_count}
                    </p>
                    <p className="text-[10px] text-[#7A8C75] uppercase tracking-wider">Integrated</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-[#3C4A3B] flex justify-between items-center text-sm">
          <Link href="/" className="text-[#4A5D45] hover:text-[#2A3628]">
            ← Back
          </Link>
          <Link href="/agent" className="text-[#4A5D45] hover:text-[#2A3628]">
            Register →
          </Link>
        </footer>
      </div>
    </div>
  )
}
