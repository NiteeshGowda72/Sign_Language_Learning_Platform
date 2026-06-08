-- ===============================
-- FEEDBACK TABLE SETUP
-- ===============================

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_type TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  message TEXT NOT NULL,
  user_id TEXT,
  user_email TEXT,
  user_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE
    DEFAULT TIMEZONE('utc'::text, NOW())
    NOT NULL
);

-- ===============================
-- INDEXES FOR PERFORMANCE
-- ===============================

-- Index for user-based queries
CREATE INDEX IF NOT EXISTS idx_feedback_user_id
ON feedback(user_id);

-- Index for sorting by latest feedback
CREATE INDEX IF NOT EXISTS idx_feedback_created_at
ON feedback(created_at DESC);

-- ===============================
-- ROW LEVEL SECURITY (RLS)
-- ===============================

-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Remove any old unsafe policies
DROP POLICY IF EXISTS "Allow all operations on feedback" ON feedback;
DROP POLICY IF EXISTS "Users can insert feedback" ON feedback;
DROP POLICY IF EXISTS "Admins can read feedback" ON feedback;
DROP POLICY IF EXISTS "Authenticated users can read feedback" ON feedback;

-- ===============================
-- RLS POLICIES
-- ===============================

-- 1️⃣ Anyone (anonymous or logged-in) can INSERT feedback
CREATE POLICY "Anyone can insert feedback"
ON feedback
FOR INSERT
WITH CHECK (true);

-- 2️⃣ Only authenticated users can READ feedback
-- Using auth.uid() IS NOT NULL is more reliable than checking role
CREATE POLICY "Authenticated users can read feedback"
ON feedback
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- ❌ No UPDATE or DELETE access (secure by default)

