-- Follow-up notes written by counselors and visible to the student they're about.
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS.

CREATE TABLE IF NOT EXISTS follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS follow_ups_student_id_created_at_idx
  ON follow_ups (student_id, created_at DESC);

ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

-- Counselors can manage every follow-up note.
DROP POLICY IF EXISTS "Counselors manage follow_ups" ON follow_ups;
CREATE POLICY "Counselors manage follow_ups" ON follow_ups
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'counselor')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'counselor')
  );

-- Students can read (only read) their own follow-up notes.
DROP POLICY IF EXISTS "Students read own follow_ups" ON follow_ups;
CREATE POLICY "Students read own follow_ups" ON follow_ups
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());
