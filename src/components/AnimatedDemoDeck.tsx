'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { DEMO_AGENTS, type DemoAgent } from '@/lib/seed-agent-data'

type SwipeDirection = 'left' | 'right' | null
type AnimationPhase = 'idle' | 'deciding' | 'swiping' | 'transitioning'

export function AnimatedDemoDeck() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState<AnimationPhase>('idle')
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>(null)
  const [highlightedButton, setHighlightedButton] = useState<'archive' | 'integrate' | null>(null)

  const currentAgent = DEMO_AGENTS[currentIndex]
  const nextAgent = DEMO_AGENTS[(currentIndex + 1) % DEMO_AGENTS.length]
  const thirdAgent = DEMO_AGENTS[(currentIndex + 2) % DEMO_AGENTS.length]

  const advanceToNextCard = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % DEMO_AGENTS.length)
    setPhase('idle')
    setSwipeDirection(null)
    setHighlightedButton(null)
  }, [])

  const startSwipeAnimation = useCallback(() => {
    // Randomly choose archive or integrate
    const isIntegrate = Math.random() > 0.5
    const direction: SwipeDirection = isIntegrate ? 'right' : 'left'
    const button: 'archive' | 'integrate' = isIntegrate ? 'integrate' : 'archive'

    // Phase 1: Deciding - highlight the button
    setPhase('deciding')
    setHighlightedButton(button)

    // Phase 2: Swiping - after brief pause, start the swipe
    setTimeout(() => {
      setPhase('swiping')
      setSwipeDirection(direction)
    }, 600)

    // Phase 3: Transitioning - card has left, prepare next
    setTimeout(() => {
      setPhase('transitioning')
    }, 1200)

    // Complete transition - show next card
    setTimeout(() => {
      advanceToNextCard()
    }, 1400)
  }, [advanceToNextCard])

  useEffect(() => {
    if (phase === 'idle') {
      const timer = setTimeout(startSwipeAnimation, 3000)
      return () => clearTimeout(timer)
    }
  }, [phase, startSwipeAnimation])

  const getCardStyle = (position: number): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      width: 'calc(100% - 48px)',
      maxWidth: '400px',
      transition: phase === 'swiping'
        ? 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s'
        : 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s',
    }

    if (position === 0) {
      // Current card
      if (phase === 'swiping') {
        const xOffset = swipeDirection === 'left' ? -500 : 500
        const rotation = swipeDirection === 'left' ? -30 : 30
        return {
          ...baseStyle,
          zIndex: 100,
          transform: `translateX(${xOffset}px) rotate(${rotation}deg)`,
          opacity: 0,
        }
      }
      return {
        ...baseStyle,
        zIndex: 100,
        transform: 'translateX(0) rotate(0deg)',
        opacity: 1,
      }
    } else if (position === 1) {
      // Second card (behind current)
      if (phase === 'transitioning' || (phase === 'swiping' && swipeDirection)) {
        // Move up to become the front card
        return {
          ...baseStyle,
          zIndex: 99,
          transform: 'scale(1) translateY(0) rotate(0deg)',
          opacity: 1,
        }
      }
      return {
        ...baseStyle,
        zIndex: 99,
        transform: 'scale(0.96) translateY(12px) rotate(-1deg)',
        opacity: 0.8,
      }
    } else {
      // Third card (furthest back)
      if (phase === 'transitioning' || (phase === 'swiping' && swipeDirection)) {
        // Move up to second position
        return {
          ...baseStyle,
          zIndex: 98,
          transform: 'scale(0.96) translateY(12px) rotate(-1deg)',
          opacity: 0.8,
        }
      }
      return {
        ...baseStyle,
        zIndex: 98,
        transform: 'scale(0.92) translateY(24px) rotate(1.5deg)',
        opacity: 0.6,
      }
    }
  }

  const getStampStyle = (type: 'archived' | 'integrated'): React.CSSProperties => {
    const isVisible = phase === 'swiping' && (
      (type === 'archived' && swipeDirection === 'left') ||
      (type === 'integrated' && swipeDirection === 'right')
    )

    return {
      position: 'absolute',
      top: '20px',
      padding: '8px 16px',
      border: '3px solid currentColor',
      borderRadius: '4px',
      fontSize: '24px',
      fontWeight: 'bold',
      fontFamily: 'var(--font-display)',
      textTransform: 'uppercase',
      letterSpacing: '2px',
      zIndex: 10,
      pointerEvents: 'none',
      opacity: isVisible ? 1 : 0,
      transition: 'opacity 0.2s, transform 0.2s',
      ...(type === 'archived' ? {
        left: '20px',
        color: 'var(--ink-secondary)',
        transform: isVisible ? 'rotate(-15deg) scale(1)' : 'rotate(-15deg) scale(0.8)',
      } : {
        right: '20px',
        color: '#166534',
        transform: isVisible ? 'rotate(15deg) scale(1)' : 'rotate(15deg) scale(0.8)',
      }),
    }
  }

  const renderCard = (agent: DemoAgent, position: number) => (
    <div className="rm-card" style={getCardStyle(position)} key={`${agent.name}-${position}`}>
      {position === 0 && (
        <>
          <div style={getStampStyle('archived')}>ARCHIVED</div>
          <div style={getStampStyle('integrated')}>INTEGRATED</div>
        </>
      )}
      <div className="rm-card-visual">
        <div className="rm-noise-grid"></div>
        <div className="rm-avatar-container">
          <Image
            src={agent.avatar_url}
            alt={agent.name}
            width={120}
            height={120}
            style={{ borderRadius: '50%' }}
          />
        </div>
      </div>
      <div className="rm-card-body">
        <div className="rm-card-header">
          <div>
            <div className="rm-agent-name">{agent.name}</div>
            <span className="rm-agent-type">{agent.type}</span>
          </div>
        </div>
        <p className="rm-agent-bio">{agent.bio}</p>
        <div className="rm-action-grid">
          <button
            className={`rm-action-btn pass ${highlightedButton === 'archive' && position === 0 ? 'highlighted' : ''}`}
            style={highlightedButton === 'archive' && position === 0 ? { background: '#E8E6DF' } : {}}
          >
            Archive
          </button>
          <button
            className={`rm-action-btn connect ${highlightedButton === 'integrate' && position === 0 ? 'highlighted' : ''}`}
            style={highlightedButton === 'integrate' && position === 0 ? { opacity: 0.8 } : {}}
          >
            Integrate
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="rm-deck-container" id="deck">
      <style>{`
        .rm-avatar-container {
          position: absolute;
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .rm-action-btn.highlighted {
          transition: all 0.2s ease;
        }
      `}</style>

      <div className="rm-empty-state">
        <h3>No More Agents</h3>
        <p>Check back later for new matches.</p>
      </div>

      {/* Render cards in reverse order so the front card is on top */}
      {renderCard(thirdAgent, 2)}
      {renderCard(nextAgent, 1)}
      {renderCard(currentAgent, 0)}
    </div>
  )
}
