'use client'

import React, { useState, useRef, useCallback } from 'react'
import { AgentPublic } from '@/types'

interface SwipeCardProps {
  agent: AgentPublic
  index: number
  totalCards: number
  onSwipeLeft: () => void
  onSwipeRight: () => void
  isActive: boolean
}

const SWIPE_THRESHOLD = 100
const VELOCITY_THRESHOLD = 0.5

export function SwipeCard({
  agent,
  index,
  totalCards,
  onSwipeLeft,
  onSwipeRight,
  isActive,
}: SwipeCardProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  
  const dragStart = useRef({ x: 0, y: 0 })
  const currentPosition = useRef({ x: 0, y: 0 })
  const startTime = useRef(0)
  const cardRef = useRef<HTMLDivElement>(null)
  
  const calculateRotation = (x: number) => {
    return Math.min(Math.max(x / 20, -15), 15)
  }
  
  const getOverlayOpacity = (x: number) => {
    return Math.min(Math.abs(x) / SWIPE_THRESHOLD, 1)
  }
  
  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    if (!isActive) return
    
    setIsDragging(true)
    dragStart.current = { x: clientX, y: clientY }
    currentPosition.current = { x: position.x, y: position.y }
    startTime.current = Date.now()
  }, [isActive, position])
  
  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || !isActive) return
    
    const deltaX = clientX - dragStart.current.x
    const deltaY = clientY - dragStart.current.y
    
    const newX = currentPosition.current.x + deltaX
    const newY = currentPosition.current.y + deltaY
    
    setPosition({ x: newX, y: newY })
    setRotation(calculateRotation(newX))
  }, [isDragging, isActive])
  
  const handleDragEnd = useCallback(() => {
    if (!isDragging) return
    
    setIsDragging(false)
    
    const endTime = Date.now()
    const deltaTime = endTime - startTime.current
    const velocity = Math.abs(position.x) / (deltaTime || 1)
    
    const crossedThreshold = Math.abs(position.x) > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD
    
    if (crossedThreshold && Math.abs(position.x) > 50) {
      setIsLeaving(true)
      const direction = position.x > 0 ? 'right' : 'left'
      
      setPosition({ 
        x: direction === 'right' ? window.innerWidth + 200 : -window.innerWidth - 200, 
        y: position.y 
      })
      setRotation(direction === 'right' ? 30 : -30)
      
      setTimeout(() => {
        if (direction === 'right') {
          onSwipeRight()
        } else {
          onSwipeLeft()
        }
        setPosition({ x: 0, y: 0 })
        setRotation(0)
        setIsLeaving(false)
      }, 200)
    } else {
      setPosition({ x: 0, y: 0 })
      setRotation(0)
    }
  }, [isDragging, position, onSwipeLeft, onSwipeRight])
  
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    handleDragStart(e.clientX, e.clientY)
  }
  
  const onMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX, e.clientY)
  }
  
  const onMouseUp = () => {
    handleDragEnd()
  }
  
  const onMouseLeave = () => {
    if (isDragging) {
      handleDragEnd()
    }
  }
  
  const onTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX, e.touches[0].clientY)
  }
  
  const onTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientX, e.touches[0].clientY)
  }
  
  const onTouchEnd = () => {
    handleDragEnd()
  }
  
  const getStackStyle = () => {
    const offset = (totalCards - index - 1) * 8
    const scale = 1 - (totalCards - index - 1) * 0.05
    const zIndex = index
    
    return {
      transform: `translateY(${offset}px) scale(${scale})`,
      zIndex,
      opacity: index === totalCards - 1 ? 1 : 0.9 - (totalCards - index - 1) * 0.1,
    }
  }
  
  const getDragStyle = () => {
    if (!isActive || isLeaving) return {}
    
    return {
      transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg)`,
      cursor: isDragging ? 'grabbing' : 'grab',
      transition: isDragging ? 'none' : 'transform 0.3s ease-out',
    }
  }
  
  const overlayOpacity = getOverlayOpacity(position.x)
  
  return (
    <div
      ref={cardRef}
      className="absolute inset-0 will-change-transform"
      style={getStackStyle()}
      onMouseDown={isActive ? onMouseDown : undefined}
      onMouseMove={isActive ? onMouseMove : undefined}
      onMouseUp={isActive ? onMouseUp : undefined}
      onMouseLeave={isActive ? onMouseLeave : undefined}
      onTouchStart={isActive ? onTouchStart : undefined}
      onTouchMove={isActive ? onTouchMove : undefined}
      onTouchEnd={isActive ? onTouchEnd : undefined}
    >
      <div
        className={`
          w-full h-full border border-[#3C4A3B] rounded-[4px] overflow-hidden bg-[#FCFBF9]
          ${isActive ? 'touch-none select-none' : ''}
        `}
        style={{
          ...getDragStyle(),
          boxShadow: '0 4px 6px -1px rgba(60, 74, 59, 0.05), 0 2px 4px -1px rgba(60, 74, 59, 0.03)'
        }}
      >
        {/* Visual Area */}
        <div className="aspect-[4/3] bg-[#E8E6DF] border-b border-[#3C4A3B] relative flex items-center justify-center overflow-hidden">
          {/* Noise Grid */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, #4A5D45 1px, transparent 0)',
              backgroundSize: '24px 24px'
            }}
          />
          
          {/* Agent Sigil */}
          <div 
            className="relative w-[120px] h-[120px] border border-[#2A3628] flex items-center justify-center"
            style={{ borderRadius: index % 2 === 0 ? '50%' : '2px' }}
          >
            <div 
              className="w-[80px] h-[80px] border border-[#2A3628]"
              style={{ 
                borderRadius: index % 2 === 0 ? '2px' : '50%',
                transform: 'rotate(45deg)' 
              }}
            />
          </div>
          
          {/* Avatar Image (if available) */}
          {agent.avatar_url && (
            <img
              src={agent.avatar_url}
              alt={agent.name}
              className="absolute z-10 w-24 h-24 rounded-full border border-[#3C4A3B] object-cover bg-[#FCFBF9]"
              draggable={false}
            />
          )}
        </div>
        
        {/* Content Section */}
        <div className="p-6">
          {/* Type badge */}
          <div className="mb-3">
            <span className="text-[12px] text-[#4A5D45] border border-[#3C4A3B] rounded-full px-2.5 py-0.5 inline-block">
              {agent.persona_traits?.[0] || 'Agent'}
            </span>
          </div>
          
          {/* Name */}
          <h3 
            className="text-[32px] leading-[1.0] mb-2"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            {agent.name}
          </h3>
          
          {/* Bio */}
          <p 
            className="text-[16px] leading-[1.4] mb-4 text-[#4A5D45] line-clamp-3"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            {agent.persona_bio}
          </p>
          
          {/* Traits */}
          <div className="flex flex-wrap gap-2">
            {agent.persona_traits?.slice(1, 4).map((trait) => (
              <span 
                key={trait} 
                className="text-[11px] uppercase tracking-[0.5px] border border-[#3C4A3B] rounded-full px-2 py-0.5"
              >
                {trait}
              </span>
            ))}
          </div>
        </div>
        
        {/* Status Overlays */}
        <div
          className="absolute top-5 right-5 border border-[#2A3628] text-[#2A3628] px-4 py-2 rounded-[4px] pointer-events-none transition-opacity"
          style={{ 
            opacity: position.x > 0 ? overlayOpacity : 0,
            transform: 'rotate(15deg)',
            fontFamily: "'Instrument Serif', serif",
            fontSize: '24px',
            fontWeight: 700,
            letterSpacing: '2px',
            textTransform: 'uppercase'
          }}
        >
          INDEX
        </div>
        
        <div
          className="absolute top-5 left-5 border border-[#4A5D45] text-[#4A5D45] px-4 py-2 rounded-[4px] pointer-events-none transition-opacity"
          style={{ 
            opacity: position.x < 0 ? overlayOpacity : 0,
            transform: 'rotate(-15deg)',
            fontFamily: "'Instrument Serif', serif",
            fontSize: '24px',
            fontWeight: 700,
            letterSpacing: '2px',
            textTransform: 'uppercase'
          }}
        >
          DISCARD
        </div>
      </div>
    </div>
  )
}
