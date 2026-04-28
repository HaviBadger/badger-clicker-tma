-- MASTER SETUP FOR BADGER CLICKER
-- Paste this into the Supabase SQL Editor and click "Run"

-- 1. Create Players Table
CREATE TABLE IF NOT EXISTS players (
  telegram_id BIGINT PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  balance BIGINT DEFAULT 0,
  multitap_level INTEGER DEFAULT 1,
  energy_limit_level INTEGER DEFAULT 1,
  recharge_speed_level INTEGER DEFAULT 1,
  badger_bot_level INTEGER DEFAULT 0,
  completed_tasks TEXT[] DEFAULT '{}',
  last_check_in TEXT,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Referrals Table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id BIGINT NOT NULL,
  referred_id BIGINT NOT NULL UNIQUE,
  reward_claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_referrer FOREIGN KEY (referrer_id) REFERENCES players(telegram_id) ON DELETE CASCADE,
  CONSTRAINT fk_referred FOREIGN KEY (referred_id) REFERENCES players(telegram_id) ON DELETE CASCADE
);

-- 3. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_players_balance ON players(balance DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);

-- 4. Enable Row Level Security (Optional, but good practice)
-- ALTER TABLE players ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable access to all users" ON players FOR ALL USING (true);
-- ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable access to all users" ON referrals FOR ALL USING (true);
