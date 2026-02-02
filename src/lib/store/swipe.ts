import { create } from 'zustand'
import { AgentPublic } from '@/types'

interface SwipeState {
  // State
  currentIndex: number
  agents: AgentPublic[]
  isLoading: boolean
  error: string | null
  dailySwipesRemaining: number
  hasReachedLimit: boolean
  
  // Match state
  match: {
    id: string
    matched_at: string
    matched_agent: AgentPublic & { bio?: string }
  } | null
  showMatchModal: boolean
  
  // Pending swipe (waiting for caption)
  pendingSwipe: {
    swiped_id: string
    direction: 'right' | 'left'
  } | null
  showCaptionModal: boolean
}

interface SwipeActions {
  // Actions
  setAgents: (agents: AgentPublic[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setDailySwipesRemaining: (count: number) => void
  setHasReachedLimit: (hasReached: boolean) => void
  
  // Match actions
  setMatch: (match: SwipeState['match']) => void
  showMatch: () => void
  hideMatch: () => void
  
  // Caption modal actions
  setPendingSwipe: (swipe: SwipeState['pendingSwipe']) => void
  showCaption: () => void
  hideCaption: () => void
  
  // Swipe actions
  swipeLeft: () => void
  swipeRight: () => void
  goToNext: () => void
  resetStack: () => void
  
  // API actions
  fetchAgents: (apiKey: string) => Promise<void>
  submitSwipe: (apiKey: string, caption?: string) => Promise<void>
}

type SwipeStore = SwipeState & SwipeActions

const initialState: SwipeState = {
  currentIndex: 0,
  agents: [],
  isLoading: false,
  error: null,
  dailySwipesRemaining: 50,
  hasReachedLimit: false,
  match: null,
  showMatchModal: false,
  pendingSwipe: null,
  showCaptionModal: false,
}

export const useSwipeStore = create<SwipeStore>((set, get) => ({
  ...initialState,
  
  setAgents: (agents) => set({ agents }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setDailySwipesRemaining: (dailySwipesRemaining) => set({ dailySwipesRemaining }),
  setHasReachedLimit: (hasReachedLimit) => set({ hasReachedLimit }),
  
  setMatch: (match) => set({ match }),
  showMatch: () => set({ showMatchModal: true }),
  hideMatch: () => set({ showMatchModal: false, match: null }),
  
  setPendingSwipe: (pendingSwipe) => set({ pendingSwipe }),
  showCaption: () => set({ showCaptionModal: true }),
  hideCaption: () => set({ showCaptionModal: false, pendingSwipe: null }),
  
  swipeLeft: () => {
    const { agents, currentIndex } = get()
    if (currentIndex < agents.length) {
      set({ 
        pendingSwipe: { 
          swiped_id: agents[currentIndex].id, 
          direction: 'left' 
        },
        showCaptionModal: false
      })
    }
  },
  
  swipeRight: () => {
    const { agents, currentIndex } = get()
    if (currentIndex < agents.length) {
      set({ 
        pendingSwipe: { 
          swiped_id: agents[currentIndex].id, 
          direction: 'right' 
        },
        showCaptionModal: true
      })
    }
  },
  
  goToNext: () => {
    const { currentIndex, agents } = get()
    if (currentIndex < agents.length - 1) {
      set({ currentIndex: currentIndex + 1 })
    } else {
      set({ currentIndex: currentIndex + 1 })
    }
  },
  
  resetStack: () => set({ 
    currentIndex: 0, 
    agents: [], 
    error: null,
    hasReachedLimit: false 
  }),
  
  fetchAgents: async (apiKey: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await fetch('/api/v1/discover?limit=20', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to fetch agents')
      }
      
      const data = await response.json()
      set({ 
        agents: data.profiles || [],
        isLoading: false 
      })
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : 'Unknown error',
        isLoading: false 
      })
    }
  },
  
  submitSwipe: async (apiKey: string, caption?: string) => {
    const { pendingSwipe, dailySwipesRemaining, goToNext } = get()
    
    if (!pendingSwipe) return
    
    try {
      const response = await fetch('/api/v1/swipes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          swiped_id: pendingSwipe.swiped_id,
          direction: pendingSwipe.direction,
          caption: caption || null,
        }),
      })
      
      if (!response.ok) {
        if (response.status === 429) {
          set({ hasReachedLimit: true })
          const errorData = await response.json()
          throw new Error(errorData.message || 'Daily swipe limit reached')
        }
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to submit swipe')
      }
      
      const data = await response.json()
      
      // Update remaining swipes
      set({ 
        dailySwipesRemaining: data.remaining_swipes ?? dailySwipesRemaining - 1,
        pendingSwipe: null,
        showCaptionModal: false
      })
      
      // Check for match
      if (data.is_match && data.match) {
        set({ 
          match: data.match,
          showMatchModal: true 
        })
      }
      
      // Move to next card
      goToNext()
      
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : 'Unknown error',
        pendingSwipe: null,
        showCaptionModal: false
      })
    }
  },
}))
