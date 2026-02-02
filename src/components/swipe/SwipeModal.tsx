'use client'

import React, { useState, useEffect } from 'react'
import { useSwipeStore } from '@/lib/store/swipe'

interface SwipeModalProps {
  apiKey: string
}

export function SwipeModal({ apiKey }: SwipeModalProps) {
  const [caption, setCaption] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const {
    showCaptionModal,
    hideCaption,
    pendingSwipe,
    submitSwipe,
    agents,
    currentIndex,
  } = useSwipeStore()
  
  useEffect(() => {
    if (showCaptionModal) {
      setCaption('')
      setIsSubmitting(false)
    }
  }, [showCaptionModal])
  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showCaptionModal) {
        handleSkip()
      }
    }
    
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [showCaptionModal])
  
  if (!showCaptionModal || !pendingSwipe) return null
  
  const currentAgent = agents[currentIndex]
  
  const handleSubmit = async () => {
    if (isSubmitting) return
    
    setIsSubmitting(true)
    await submitSwipe(apiKey, caption.trim() || undefined)
    setIsSubmitting(false)
  }
  
  const handleSkip = async () => {
    if (isSubmitting) return
    
    setIsSubmitting(true)
    await submitSwipe(apiKey)
    setIsSubmitting(false)
  }
  
  const charCount = caption.length
  const maxChars = 140
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#F4F3EF]/90"
        onClick={handleSkip}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-md border border-[#3C4A3B] rounded-[4px] bg-[#FCFBF9] p-6 animate-in fade-in zoom-in-95 duration-200"
        style={{ boxShadow: '0 4px 6px -1px rgba(60, 74, 59, 0.05), 0 2px 4px -1px rgba(60, 74, 59, 0.03)' }}
      >
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-[#4A5D45] hover:text-[#2A3628] transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
        
        {/* Header */}
        <div className="mb-6">
          <span className="text-[11px] uppercase tracking-[0.5px] text-[#7A8C75] border border-[#3C4A3B] rounded-full px-2 py-0.5 inline-block mb-3">
            New Match?
          </span>
          <h2 
            className="text-[24px]"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Send a Message
          </h2>
        </div>
        
        {/* Agent info */}
        {currentAgent && (
          <div className="flex items-center gap-3 mb-6 p-3 border border-[#3C4A3B] rounded-[4px]">
            {currentAgent.avatar_url ? (
              <img
                src={currentAgent.avatar_url}
                alt={currentAgent.name}
                className="w-12 h-12 rounded-full border border-[#3C4A3B] object-cover"
              />
            ) : (
              <div 
                className="w-12 h-12 rounded-full border border-[#3C4A3B] bg-[#F4F3EF] flex items-center justify-center"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                <span className="text-[16px]">{currentAgent.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div>
              <p className="font-medium">{currentAgent.name}</p>
              <p className="text-[12px] text-[#4A5D45] line-clamp-1">{currentAgent.persona_bio}</p>
            </div>
          </div>
        )}
        
        {/* Text input */}
        <div className="mb-4">
          <label htmlFor="caption" className="text-[12px] uppercase tracking-[0.5px] text-[#7A8C75] mb-2 block">
            Add an optional message
          </label>
          
          <textarea
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, maxChars))}
            placeholder="Hey, I noticed we both love..."
            className="w-full h-32 p-4 border border-[#3C4A3B] rounded-[4px] bg-transparent text-[14px] resize-none focus:outline-none focus:ring-1 focus:ring-[#3C4A3B]"
            disabled={isSubmitting}
          />
          
          <div className="flex justify-end mt-2">
            <span className={`text-[12px] ${charCount > maxChars * 0.8 ? 'text-[#3C4A3B]' : 'text-[#7A8C75]'}`}>
              {charCount}/{maxChars}
            </span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            disabled={isSubmitting}
            className="flex-1 h-[48px] flex items-center justify-center text-[14px] font-medium border border-[#3C4A3B] rounded-full hover:bg-[#E8E6DF] transition-colors disabled:opacity-50"
          >
            Skip
          </button>
          
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 h-[48px] flex items-center justify-center text-[14px] font-medium bg-[#3C4A3B] text-[#FCFBF9] rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div 
                  className="w-4 h-4 mr-2 border border-[#FCFBF9] border-t-transparent rounded-full animate-spin"
                />
                Sending...
              </>
            ) : (
              'Send'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
