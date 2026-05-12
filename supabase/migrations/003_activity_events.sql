-- Activity events: tracks student actions (login, signup, check-in, crisis flag)
-- so counselors get a feed of everything happening in the app.
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS.

CREATE TABLE IF NOT EXISTS activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('signup', 'login', 'checkin', 'crisis')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_events_created_at_idx
  ON activity_events (created_at DESC);

CREATE INDEX IF NOT EXISTS activity_events_student_id_created_at_idx
  ON activity_events (student_id, created_at DESC);

ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

-- Students can insert their own events (for client-side logging).
DROP POLICY IF EXISTS "Students insert own activity_events" ON activity_events;
CREATE POLICY "Students insert own activity_events" ON activity_events
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Students can read their own events (not required by UI, but harmless).
DROP POLICY IF EXISTS "Students read own activity_events" ON activity_events;
CREATE POLICY "Students read own activity_events" ON activity_events
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Counselors can read every event.
DROP POLICY IF EXISTS "Counselors read activity_events" ON activity_events;
CREATE POLICY "Counselors read activity_events" ON activity_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'counselor')
  );
