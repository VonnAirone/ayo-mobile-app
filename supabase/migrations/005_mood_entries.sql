-- Direct, student-reported moods are separate from calculated assessment results.
CREATE TABLE IF NOT EXISTS mood_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mood text NOT NULL CHECK (mood IN ('struggling', 'okay', 'happy')),
  note text CHECK (char_length(note) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mood_entries_student_date_idx
  ON mood_entries (student_id, created_at DESC);
ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON mood_entries FROM anon, authenticated;
GRANT SELECT ON mood_entries TO authenticated;
GRANT INSERT (student_id, mood, note) ON mood_entries TO authenticated;

DROP POLICY IF EXISTS "Students save own moods" ON mood_entries;
CREATE POLICY "Students save own moods" ON mood_entries
  FOR INSERT TO authenticated WITH CHECK (
    student_id = auth.uid() AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student'
    )
  );
DROP POLICY IF EXISTS "Students and counselors read moods" ON mood_entries;
CREATE POLICY "Students and counselors read moods" ON mood_entries
  FOR SELECT TO authenticated USING (
    student_id = auth.uid() OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'counselor'
    )
  );
