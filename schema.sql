
-- SQL to set up the database schema in Supabase SQL Editor

-- 1. Create tables
CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  rules JSONB DEFAULT '{"maxWinsPerTicket": 1, "maxWinsPerPerson": 1, "preventDuplicatePrizeType": true, "fairnessRandom": true}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  remaining INTEGER NOT NULL DEFAULT 0,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  value NUMERIC DEFAULT 0,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel TEXT,
  upi TEXT,
  location TEXT,
  region TEXT,
  line_manager TEXT,
  department TEXT,
  position TEXT,
  employee_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  prize_id UUID REFERENCES prizes(id) ON DELETE CASCADE,
  prize_name TEXT,
  prize_image TEXT,
  participant_name TEXT,
  employee_id TEXT,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Real-time (Optional but recommended)
-- Enable replication for all tables to allow real-time updates
alter publication supabase_realtime add table programs, prizes, participants, winners;

-- 3. Row Level Security (RLS) - Basic (Allow all authenticated or anonymous for now as it is a private event tool)
-- For a real production app, you'd want more restrictive rules.
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE winners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read/write on programs" ON programs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous read/write on prizes" ON prizes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous read/write on participants" ON participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous read/write on winners" ON winners FOR ALL USING (true) WITH CHECK (true);

-- 4. RPC Functions
CREATE OR REPLACE FUNCTION reset_prizes_remaining(prog_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE prizes
  SET remaining = quantity
  WHERE program_id = prog_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Views (Optional but helpful)
CREATE OR REPLACE VIEW winner_details AS
SELECT 
  w.id,
  w.created_at,
  w.program_id,
  pg.name as program_name,
  w.prize_id,
  pr.name as prize_name,
  pr.image as prize_image,
  w.participant_id,
  pt.name as ticket_name,
  pt.employee_id,
  pt.department
FROM winners w
JOIN programs pg ON w.program_id = pg.id
JOIN prizes pr ON w.prize_id = pr.id
JOIN participants pt ON w.participant_id = pt.id;
