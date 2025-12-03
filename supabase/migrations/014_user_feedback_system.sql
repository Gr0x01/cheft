-- Migration: user_feedback_system
-- Adds user feedback/reporting system for chefs and restaurants

-- ============================================
-- USER FEEDBACK TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('chef', 'restaurant')),
  entity_id UUID NOT NULL,
  issue_type TEXT NOT NULL CHECK (issue_type IN (
    'closed',           -- Restaurant permanently closed
    'incorrect_info',   -- Wrong information (bio, cuisine, etc.)
    'wrong_photo',      -- Incorrect or inappropriate photo
    'other'             -- Other issues
  )),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_feedback_entity 
  ON user_feedback(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_user_feedback_status 
  ON user_feedback(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_feedback_pending 
  ON user_feedback(created_at DESC) 
  WHERE status = 'pending';

-- Add comments for documentation
COMMENT ON TABLE user_feedback IS 'User-submitted feedback and issue reports for chefs and restaurants';
COMMENT ON COLUMN user_feedback.entity_type IS 'Type of entity: chef or restaurant';
COMMENT ON COLUMN user_feedback.entity_id IS 'UUID of the chef or restaurant';
COMMENT ON COLUMN user_feedback.issue_type IS 'Type of issue: closed, incorrect_info, wrong_photo, other';
COMMENT ON COLUMN user_feedback.message IS 'Optional user-provided details about the issue';
COMMENT ON COLUMN user_feedback.status IS 'Review status: pending, reviewed, resolved';
COMMENT ON COLUMN user_feedback.reviewed_by IS 'Admin email who reviewed the feedback';
COMMENT ON COLUMN user_feedback.reviewed_at IS 'Timestamp when feedback was reviewed';
COMMENT ON COLUMN user_feedback.resolved_at IS 'Timestamp when issue was resolved';

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit feedback (no auth required)
CREATE POLICY "Anyone can insert feedback" ON user_feedback 
  FOR INSERT 
  WITH CHECK (true);

-- Only authenticated users (admins) can read feedback
CREATE POLICY "Authenticated users can read feedback" ON user_feedback 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Only authenticated users (admins) can update feedback
CREATE POLICY "Authenticated users can update feedback" ON user_feedback 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get feedback summary grouped by entity
CREATE OR REPLACE FUNCTION get_feedback_summary()
RETURNS TABLE (
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  issue_type TEXT,
  count BIGINT,
  latest_message TEXT,
  latest_created_at TIMESTAMPTZ,
  pending_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH feedback_agg AS (
    SELECT 
      uf.entity_type,
      uf.entity_id,
      uf.issue_type,
      COUNT(*) as count,
      MAX(uf.message) as latest_message,
      MAX(uf.created_at) as latest_created_at,
      COUNT(*) FILTER (WHERE uf.status = 'pending') as pending_count
    FROM user_feedback uf
    WHERE uf.status = 'pending'
    GROUP BY uf.entity_type, uf.entity_id, uf.issue_type
  )
  SELECT 
    fa.entity_type,
    fa.entity_id,
    CASE 
      WHEN fa.entity_type = 'chef' THEN c.name
      WHEN fa.entity_type = 'restaurant' THEN r.name
    END as entity_name,
    fa.issue_type,
    fa.count,
    fa.latest_message,
    fa.latest_created_at,
    fa.pending_count
  FROM feedback_agg fa
  LEFT JOIN chefs c ON fa.entity_type = 'chef' AND fa.entity_id = c.id
  LEFT JOIN restaurants r ON fa.entity_type = 'restaurant' AND fa.entity_id = r.id
  ORDER BY fa.pending_count DESC, fa.latest_created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_feedback_summary IS 'Returns aggregated feedback summary grouped by entity and issue type';

-- Function to mark feedback as resolved
CREATE OR REPLACE FUNCTION resolve_feedback(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_issue_type TEXT,
  p_reviewed_by TEXT
) RETURNS void AS $$
BEGIN
  IF p_entity_type NOT IN ('chef', 'restaurant') THEN
    RAISE EXCEPTION 'Invalid entity_type: %', p_entity_type;
  END IF;

  IF p_issue_type NOT IN ('closed', 'incorrect_info', 'wrong_photo', 'other') THEN
    RAISE EXCEPTION 'Invalid issue_type: %', p_issue_type;
  END IF;

  UPDATE user_feedback 
  SET 
    status = 'resolved',
    reviewed_by = p_reviewed_by,
    reviewed_at = COALESCE(reviewed_at, now()),
    resolved_at = now(),
    updated_at = now()
  WHERE 
    entity_type = p_entity_type 
    AND entity_id = p_entity_id 
    AND issue_type = p_issue_type
    AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION resolve_feedback IS 'Marks all pending feedback for a specific entity + issue type as resolved';
