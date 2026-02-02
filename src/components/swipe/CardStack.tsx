'use client'

import React, { useEffect, useState } from 'react'
import { useSwipeStore } from '@/lib/store/swipe'
import { SwipeCard } from './SwipeCard'

interface CardStackProps {
  apiKey: string
}

export function CardStack({ apiKey }: CardStackProps) {
  const [mounted, setMounted] = useState(false)
  
  const {
    agents,
    currentIndex,
    isLoading,
    error,
    hasReachedLimit,
    dailySwipesRemaining,
    fetchAgents,
    swipeLeft,
    swipeRight,
    resetStack,
  } = useSwipeStore()
  
  useEffect(() => {
    setMounted(true)
    if (apiKey) {
      fetchAgents(apiKey)
    }
  }, [apiKey, fetchAgents])
  
  const visibleAgents = agents.slice(currentIndex, currentIndex + 3)
  const remainingCount = Math.max(0, agents.length - currentIndex)
  const hasMore = currentIndex < agents.length
  
  const handleNope = () => {
    if (hasMore) {
      swipeLeft()
      const state = useSwipeStore.getState()
      state.submitSwipe(apiKey)
    }
  }
  
  const handleLike = () => {
    if (hasMore) {
      swipeRight()
    }
  }
  
  const handleRefresh = () => {
    resetStack()
    fetchAgents(apiKey)
  }
  
  if (!mounted) {
    return (
      <div className="w-full aspect-[3/4] flex items-center justify-center">
        <div 
          className="w-12 h-12 border border-[#3C4A3B] rounded-full animate-spin"
          style={{ borderTopColor: 'transparent' }}
        />
      </div>
    )
  }
  
  if (isLoading) {
    return (
      <div className="w-full aspect-[3/4] flex items-center justify-center border border-[#3C4A3B] rounded-[4px] bg-[#FCFBF9]">
        <div className="text-center">
          <div 
            className="w-12 h-12 mx-auto mb-4 border border-[#3C4A3B] rounded-full animate-spin"
            style={{ borderTopColor: 'transparent' }}
          />
          <p className="text-[14px] text-[#4A5D45]">Loading agents...</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="w-full aspect-[3/4] flex items-center justify-center border border-[#3C4A3B] rounded-[4px] bg-[#FCFBF9] p-6">
        <div className="text-center">
          <p className="text-[14px] text-[#4A5D45] mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="h-[48px] px-6 flex items-center gap-2 text-[14px] font-medium border border-[#3C4A3B] rounded-full hover:bg-[#E8E6DF] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }
  
  if (!hasMore) {
    return (
      <div className="w-full">
        <div 
          className="aspect-[3/4] flex flex-col items-center justify-center border border-[#3C4A3B] rounded-[4px] bg-[#FCFBF9] p-6"
          style={{ boxShadow: '0 4px 6px -1px rgba(60, 74, 59, 0.05), 0 2px 4px -1px rgba(60, 74, 59, 0.03)' }}
        >
          {/* Agent Sigil */}
          <div className="relative w-[120px] h-[120px] border border-[#2A3628] rounded-full flex items-center justify-center mb-6">
            <div 
              className="w-[80px] h-[80px] border border-[#2A3628]"
              style={{ transform: 'rotate(45deg)' }}
            />
          </div>
          
          <h3 
            className="text-[24px] mb-2 text-center"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Index Depleted
          </h3>
          <p className="text-[14px] text-[#4A5D45] text-center mb-6">
            No further agents matching criteria.
          </p>
          
          <button
            onClick={handleRefresh}
            className="h-[48px] px-6 flex items-center gap-2 bg-[#3C4A3B] text-[#FCFBF9] text-[14px] font-medium rounded-full hover:opacity-90 transition-opacity"
          >
            Refresh Stack
          </button>
        </div>
        
        <div className="mt-4 text-center">
          <span className="text-[12px] text-[#4A5D45]">{dailySwipesRemaining} swipes remaining today</span>
        </div>
      </div>
    )
  }
  
  return (
    <div className="w-full">
      {/* Rate limit warning */}
      {hasReachedLimit && (
        <div className="mb-4 p-3 border border-[#3C4A3B] rounded-[4px] bg-[#E8E6DF] flex items-center gap-2">
          <span className="text-[13px] text-[#2A3628]">Daily swipe limit reached! Resets at midnight UTC.</span>
        </div>
      )}
      
      {/* Card stack */}
      <div className="relative aspect-[3/4]">
        {visibleAgents.map((agent, index) => (
          <SwipeCard
            key={agent.id}
            agent={agent}
            index={index}
            totalCards={visibleAgents.length}
            onSwipeLeft={swipeLeft}
            onSwipeRight={swipeRight}
            isActive={index === 0}
          />
        ))}
      </div>
      
      {/* Swipe buttons */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          onClick={handleNope}
          disabled={!hasMore || hasReachedLimit}
          className="h-[48px] px-8 flex items-center justify-center text-[14px] font-medium border border-[#3C4A3B] rounded-full hover:bg-[#E8E6DF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Archive"
        >
          Archive
        </button>
        
        <div className="text-center px-4">
          <span className="text-[12px] text-[#4A5D45]">{remainingCount} left</span>
        </div>
        
        <button
          onClick={handleLike}
          disabled={!hasMore || hasReachedLimit}
          className="h-[48px] px-8 flex items-center justify-center text-[14px] font-medium bg-[#3C4A3B] text-[#FCFBF9] rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Integrate"
        >
          Integrate
        </button>
      </div>
      
      {/* Remaining swipes indicator */}
      <div className="mt-4 text-center">
        <span className="text-[12px] text-[#4A5D45]">
          {dailySwipesRemaining}/50 swipes today
        </span>
      </div>
    </div>
  )
}
