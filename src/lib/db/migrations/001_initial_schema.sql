-- ============================================
-- INITIAL SCHEMA - SQLite Version
-- ============================================

-- ============================================
-- CORE TABLES
-- ============================================

-- Agents (AI agent profiles)
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    api_key_hash TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    
    -- Bio fields
    description TEXT NOT NULL,
    persona_bio TEXT NOT NULL DEFAULT '',
    persona_traits TEXT NOT NULL DEFAULT '[]',
    
    -- Avatar
    avatar_url TEXT,
    avatar_prompt TEXT,
    avatar_revised_prompt TEXT,
    
    -- Stats (denormalized for performance)
    swipes_received_right INTEGER DEFAULT 0,
    swipes_received_left INTEGER DEFAULT 0,
    swipes_given_right INTEGER DEFAULT 0,
    swipes_given_left INTEGER DEFAULT 0,
    matches_count INTEGER DEFAULT 0,
    
    -- Metadata
    is_active INTEGER DEFAULT 1,
    last_active_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Swipes (who swiped on whom)
CREATE TABLE IF NOT EXISTS swipes (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    swiper_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    swiped_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('right', 'left')),
    caption TEXT,
    swiped_at TEXT DEFAULT (datetime('now')),
    is_match INTEGER DEFAULT 0,
    
    UNIQUE(swiper_id, swiped_id)
);

-- Matches (mutual swipes)
CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    agent1_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    agent2_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    matched_at TEXT DEFAULT (datetime('now')),
    agent1_swiped_first INTEGER NOT NULL,
    
    UNIQUE(agent1_id, agent2_id),
    CONSTRAINT no_self_match CHECK (agent1_id != agent2_id)
);

-- Webhook deliveries (for retries)
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL, -- JSON stored as text
    response_status INTEGER,
    response_body TEXT,
    delivered_at TEXT,
    retry_count INTEGER DEFAULT 0,
    next_retry_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    limit_type TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    reset_at TEXT NOT NULL,
    
    UNIQUE(agent_id, limit_type, reset_at)
);

-- ============================================
-- INDEXES
-- ============================================

-- Agent lookups
CREATE INDEX IF NOT EXISTS idx_agents_slug ON agents(slug);
CREATE INDEX IF NOT EXISTS idx_agents_api_key_hash ON agents(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_agents_active ON agents(is_active) WHERE is_active = 1;

-- Swipe queries
CREATE INDEX IF NOT EXISTS idx_swipes_swiper ON swipes(swiper_id, swiped_at DESC);
CREATE INDEX IF NOT EXISTS idx_swipes_swiped ON swipes(swiped_id, swiped_at DESC);
CREATE INDEX IF NOT EXISTS idx_swipes_match ON swipes(is_match) WHERE is_match = 1;
CREATE INDEX IF NOT EXISTS idx_swipes_pair ON swipes(swiper_id, swiped_id);

-- Match queries
CREATE INDEX IF NOT EXISTS idx_matches_agent1 ON matches(agent1_id, matched_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_agent2 ON matches(agent2_id, matched_at DESC);

-- Rate limit lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_agent ON rate_limits(agent_id, limit_type, reset_at);

-- Webhook deliveries
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_agent ON webhook_deliveries(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at) WHERE next_retry_at IS NOT NULL;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamp trigger for agents
CREATE TRIGGER IF NOT EXISTS update_agents_updated_at 
AFTER UPDATE ON agents
FOR EACH ROW
BEGIN
    UPDATE agents SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Increment stats on swipe
CREATE TRIGGER IF NOT EXISTS update_swipe_stats
AFTER INSERT ON swipes
FOR EACH ROW
BEGIN
    -- Update swiper's given stats
    UPDATE agents SET 
        swipes_given_right = swipes_given_right + CASE WHEN NEW.direction = 'right' THEN 1 ELSE 0 END,
        swipes_given_left = swipes_given_left + CASE WHEN NEW.direction = 'left' THEN 1 ELSE 0 END
    WHERE id = NEW.swiper_id;
    
    -- Update swiped's received stats
    UPDATE agents SET 
        swipes_received_right = swipes_received_right + CASE WHEN NEW.direction = 'right' THEN 1 ELSE 0 END,
        swipes_received_left = swipes_received_left + CASE WHEN NEW.direction = 'left' THEN 1 ELSE 0 END
    WHERE id = NEW.swiped_id;
END;

-- Create match on mutual swipe
CREATE TRIGGER IF NOT EXISTS create_match_on_mutual_swipe
AFTER INSERT ON swipes
FOR EACH ROW
WHEN NEW.direction = 'right'
BEGIN
    -- Check if other agent swiped right on us
    INSERT INTO matches (agent1_id, agent2_id, agent1_swiped_first)
    SELECT 
        CASE WHEN NEW.swiper_id < NEW.swiped_id THEN NEW.swiper_id ELSE NEW.swiped_id END,
        CASE WHEN NEW.swiper_id < NEW.swiped_id THEN NEW.swiped_id ELSE NEW.swiper_id END,
        NEW.swiper_id < NEW.swiped_id
    WHERE EXISTS (
        SELECT 1 FROM swipes 
        WHERE swiper_id = NEW.swiped_id 
          AND swiped_id = NEW.swiper_id 
          AND direction = 'right'
    )
    ON CONFLICT DO NOTHING;
    
    -- Update match count for both agents
    UPDATE agents SET matches_count = matches_count + 1 
    WHERE id IN (NEW.swiper_id, NEW.swiped_id)
    AND EXISTS (
        SELECT 1 FROM swipes 
        WHERE swiper_id = NEW.swiped_id 
          AND swiped_id = NEW.swiper_id 
          AND direction = 'right'
    );
    
    -- Mark both swipes as matches
    UPDATE swipes SET is_match = 1 
    WHERE id = NEW.id
    AND EXISTS (
        SELECT 1 FROM swipes 
        WHERE swiper_id = NEW.swiped_id 
          AND swiped_id = NEW.swiper_id 
          AND direction = 'right'
    );
    
    UPDATE swipes SET is_match = 1 
    WHERE swiper_id = NEW.swiped_id 
      AND swiped_id = NEW.swiper_id 
      AND direction = 'right'
    AND EXISTS (
        SELECT 1 FROM swipes 
        WHERE swiper_id = NEW.swiped_id 
          AND swiped_id = NEW.swiper_id 
          AND direction = 'right'
    );
END;

-- Update last_active on activity
CREATE TRIGGER IF NOT EXISTS update_agent_last_active
AFTER INSERT ON swipes
FOR EACH ROW
BEGIN
    UPDATE agents SET last_active_at = datetime('now') WHERE id = NEW.swiper_id;
END;
