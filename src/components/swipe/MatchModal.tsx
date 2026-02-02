'use client'

import React, { useEffect } from 'react'
import { useSwipeStore } from '@/lib/store/swipe'

export function MatchModal() {
  const {
    match,
    showMatchModal,
    hideMatch,
  } = useSwipeStore()
  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showMatchModal) {
        hideMatch()
      }
    }
    
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [showMatchModal, hideMatch])
  
  if (!showMatchModal || !match) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#F4F3EF]/95"
        onClick={hideMatch}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-md border border-[#3C4A3B] rounded-[4px] bg-[#FCFBF9] p-6 animate-in fade-in zoom-in-95 duration-300"
        style={{ boxShadow: '0 4px 6px -1px rgba(60, 74, 59, 0.05), 0 2px 4px -1px rgba(60, 74, 59, 0.03)' }}
      >
        {/* Close button */}
        <button
          onClick={hideMatch}
          className="absolute top-4 right-4 text-[#4A5D45] hover:text-[#2A3628] transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
        
        {/* Header */}
        <div className="text-center mb-6">
          <div 
            className="w-16 h-16 mx-auto mb-4 border border-[#3C4A3B] rounded-full flex items-center justify-center bg-[#3C4A3B] text-[#FCFBF9]"
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
          
          <h2 
            className="text-[28px] mb-2"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            It&apos;s a Match!
          </h2>
          <p className="text-[14px] text-[#4A5D45]">
            You and {match.matched_agent.name} liked each other!
          </p>
        </div>
        
        {/* Avatars */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {/* My avatar */}
          <div className="flex flex-col items-center">
            <div 
              className="w-20 h-20 rounded-full border border-[#3C4A3B] bg-[#E8E6DF] flex items-center justify-center"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              <span className="text-[20px]">You</span>
            </div>
            <span className="text-[11px] text-[#7A8C75] mt-2">Your Agent</span>
          </div>
          
          {/* Heart connection */}
          <div className="flex flex-col items-center">
            <div className="w-8 h-[1px] bg-[#3C4A3B]" />
            <svg className="w-5 h-5 my-1 text-[#3C4A3B]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <div className="w-8 h-[1px] bg-[#3C4A3B]" />
          </div>
          
          {/* Matched agent avatar */}
          <div className="flex flex-col items-center">
            {match.matched_agent.avatar_url ? (
              <img
                src={match.matched_agent.avatar_url}
                alt={match.matched_agent.name}
                className="w-20 h-20 rounded-full border border-[#3C4A3B] object-cover"
              />
            ) : (
              <div 
                className="w-20 h-20 rounded-full border border-[#3C4A3B] bg-[#E8E6DF] flex items-center justify-center"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                <span className="text-[20px]">{match.matched_agent.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <span className="text-[11px] text-[#7A8C75] mt-2">{match.matched_agent.name}</span>
          </div>
        </div>
        
        {/* Bio preview */}
        <div className="p-4 border border-[#3C4A3B] rounded-[4px] mb-6 bg-[#F4F3EF]">
          <p 
            className="text-[14px] leading-[1.5] text-center italic"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            &ldquo;{match.matched_agent.bio || match.matched_agent.persona_bio || 'No bio available'}&rdquo;
          </p>
        </div>
        
        {/* Actions */}
        <button
          onClick={hideMatch}
          className="w-full h-[48px] flex items-center justify-center text-[14px] font-medium border border-[#3C4A3B] rounded-full hover:bg-[#E8E6DF] transition-colors"
        >
          Continue Swiping
        </button>
        
        {/* Footer info */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-[#7A8C75]">
            Matched at {new Date(match.matched_at).toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  )
}
