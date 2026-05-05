
-- ==========================================
-- SQL HOÀN CHỈNH - CHẠY TRONG SQL EDITOR SUPABASE
-- Script này giúp khởi tạo/cập nhật database một cách an toàn (idempotent)
-- ==========================================

-- 1. Tạo bảng (nếu chưa có)
CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  rules JSONB DEFAULT '{"maxWinsPerTicket": 1, "maxWinsPerPerson": 1, "preventDuplicatePrizeType": true, "fairnessRandom": true}'::jsonb,
  month INTEGER,
  year INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  remaining INTEGER NOT NULL DEFAULT 0,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  value NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel TEXT,
  upi TEXT,
  location TEXT,
  region TEXT,
  line_manager TEXT,
  phone TEXT,
  department TEXT,
  position TEXT,
  employee_id TEXT,
  ticket_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  prize_id UUID REFERENCES prizes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Đảm bảo cấu trúc cột (Migrations)
ALTER TABLE programs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE prizes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE participants ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE winners ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE participants ADD COLUMN IF NOT EXISTS channel TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS upi TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS line_manager TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS ticket_number TEXT;

ALTER TABLE programs ADD COLUMN IF NOT EXISTS rules JSONB DEFAULT '{"maxWinsPerTicket": 1, "maxWinsPerPerson": 1, "preventDuplicatePrizeType": true, "fairnessRandom": true}'::jsonb;
ALTER TABLE prizes ADD COLUMN IF NOT EXISTS remaining INTEGER DEFAULT 0;

-- Cập nhật giá trị còn lại nếu đang bị null
UPDATE prizes SET remaining = quantity WHERE remaining IS NULL OR remaining = 0;

-- 3. Kích hoạt Realtime (Chống lỗi nếu đã tồn tại)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'programs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE programs;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'prizes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE prizes;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'participants') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE participants;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'winners') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE winners;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 4. Cấu hình bảo mật RLS
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE winners ENABLE ROW LEVEL SECURITY;

-- Reset Policies (Xóa tất cả chính sách cũ để tránh xung đột)
DROP POLICY IF EXISTS "Allow anonymous read/write on programs" ON programs;
DROP POLICY IF EXISTS "Allow anonymous read/write on prizes" ON prizes;
DROP POLICY IF EXISTS "Allow anonymous read/write on participants" ON participants;
DROP POLICY IF EXISTS "Allow anonymous read/write on winners" ON winners;

DROP POLICY IF EXISTS "Users can manage their own programs" ON programs;
CREATE POLICY "Users can manage their own programs" ON programs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own prizes" ON prizes;
CREATE POLICY "Users can manage their own prizes" ON prizes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own participants" ON participants;
CREATE POLICY "Users can manage their own participants" ON participants FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own winners" ON winners;
CREATE POLICY "Users can manage their own winners" ON winners FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Hàm reset giải thưởng
CREATE OR REPLACE FUNCTION reset_prizes_remaining(prog_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE prizes
  SET remaining = quantity
  WHERE program_id = prog_id;
END;
$$ LANGUAGE plpgsql;
