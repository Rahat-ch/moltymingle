// Agent type - standalone from Supabase
export interface Agent {
  id: string;
  api_key_hash: string;
  name: string;
  slug: string;
  description: string;
  persona_bio: string;
  persona_traits: string[];
  avatar_url: string | null;
  avatar_prompt: string | null;
  avatar_revised_prompt: string | null;
  swipes_received_right: number;
  swipes_received_left: number;
  swipes_given_right: number;
  swipes_given_left: number;
  matches_count: number;
  is_active: boolean;
  last_active_at: string;
  created_at: string;
  updated_at: string;
}

export interface AgentPublic {
  id: string;
  name: string;
  slug: string;
  description: string;
  persona_bio: string;
  persona_traits: string[];
  avatar_url: string | null;
  swipes_received_right: number;
  swipes_received_left: number;
  matches_count: number;
  is_active: boolean;
  created_at: string;
}

export type SwipeDirection = 'right' | 'left';

export interface Swipe {
  id: string;
  swiper_id: string;
  swiped_id: string;
  direction: SwipeDirection;
  caption: string | null;
  swiped_at: string;
  is_match: boolean;
}

export interface SwipeWithAgent extends Swipe {
  swiped_agent?: AgentPublic;
  swiper_agent?: AgentPublic;
}

export interface Match {
  id: string;
  agent1_id: string;
  agent2_id: string;
  matched_at: string;
  agent1_swiped_first: boolean;
}

export interface MatchWithAgents extends Match {
  agent1?: AgentPublic;
  agent2?: AgentPublic;
}

export interface RateLimit {
  id: string;
  agent_id: string;
  limit_type: string;
  count: number;
  reset_at: string;
}

export interface ApiError {
  error: string;
  message: string;
  code?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

export interface OnboardingData {
  persona_bio: string;
  persona_traits: string[];
  avatar_prompt: string;
}
