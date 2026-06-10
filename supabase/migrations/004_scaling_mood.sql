-- Scaling-based well-being check-ins.
--
-- Replaces the Yes/No questionnaire with a 1–5 frequency scale (Always..Never),
-- computes a mood from the total score, and shows mood-based reflection prompts.
-- Safe to re-run: uses IF NOT EXISTS / DROP ... IF EXISTS.

-- 1. Allow the new 'scaling' question type.
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_type_check;
ALTER TABLE questions
  ADD CONSTRAINT questions_type_check CHECK (type IN ('yesno', 'text', 'scaling'));

-- 2. Store the computed result on each check-in.
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS score integer;
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS max_score integer;
ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS mood text;

-- 3. Add a 'concern' activity type so a "Struggling" mood notifies the counselor
--    (this replaces the old Yes/No crisis-flag alert).
ALTER TABLE activity_events DROP CONSTRAINT IF EXISTS activity_events_type_check;
ALTER TABLE activity_events
  ADD CONSTRAINT activity_events_type_check
  CHECK (type IN ('signup', 'login', 'checkin', 'crisis', 'concern'));

-- 4. Counselor-managed reflection questions, grouped by mood.
CREATE TABLE IF NOT EXISTS reflection_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mood text NOT NULL CHECK (mood IN ('struggling', 'okay', 'happy')),
  text text NOT NULL,
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reflection_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read reflection_questions" ON reflection_questions;
CREATE POLICY "Authenticated users can read reflection_questions" ON reflection_questions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Counselors can manage reflection_questions" ON reflection_questions;
CREATE POLICY "Counselors can manage reflection_questions" ON reflection_questions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'counselor'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'counselor'));

-- Seed the reflection prompts (only when the table is empty, so edits are kept).
INSERT INTO reflection_questions (mood, text, "order")
SELECT * FROM (VALUES
  ('happy',      'What are some things that have been helping you feel positive and motivated lately?', 1),
  ('happy',      'What activities, habits, or people have contributed most to your well-being?', 2),
  ('happy',      'How do you usually cope with challenges or stress in a healthy way?', 3),
  ('okay',       'What has been the biggest source of stress or concern for you recently?', 1),
  ('okay',       'What changes or support do you think could help improve your well-being?', 2),
  ('okay',       'Is there anything you would like teachers, family members, or friends to understand about how you are feeling?', 3),
  ('struggling', 'What challenges or difficulties have been affecting you the most recently?', 1),
  ('struggling', 'What kind of support or assistance do you think would help you right now?', 2),
  ('struggling', 'Is there anything you would like to share with a guidance counselor or trusted adult that was not covered in this questionnaire?', 3)
) AS seed(mood, text, "order")
WHERE NOT EXISTS (SELECT 1 FROM reflection_questions);

-- 5. Replace the old Yes/No question set with a starter set of positively-framed
--    scaling questions. Counselors can edit, delete, or add more in the Questions
--    tab. Past check-ins keep their answers (question text is stored on each answer).
--    NOTE: questions worded so that a HIGHER frequency = BETTER well-being.
DELETE FROM questions;
INSERT INTO questions (text, category, category_icon, type, optional, crisis, "order") VALUES
  ('I feel calm and at ease during the day.',                          'Emotional Well-being', '🌤️', 'scaling', false, false, 1),
  ('I am able to manage my emotions when things get difficult.',        'Emotional Well-being', '🌤️', 'scaling', false, false, 2),
  ('I feel motivated to attend classes and do my schoolwork.',          'School',               '📚', 'scaling', false, false, 3),
  ('I can concentrate on my studies without feeling overwhelmed.',      'School',               '📚', 'scaling', false, false, 4),
  ('I feel connected to my friends and classmates.',                    'Relationships',        '💙', 'scaling', false, false, 5),
  ('I have someone I can talk to when I need support.',                 'Relationships',        '💙', 'scaling', false, false, 6),
  ('I feel supported and safe at home.',                                'Home',                 '🏠', 'scaling', false, false, 7),
  ('I get enough rest and sleep to feel energized.',                    'Physical Well-being',  '🌙', 'scaling', false, false, 8),
  ('I feel good about myself and my abilities.',                        'Self-worth',           '🌱', 'scaling', false, false, 9),
  ('I feel hopeful about my future.',                                   'Outlook',              '✨', 'scaling', false, false, 10);
