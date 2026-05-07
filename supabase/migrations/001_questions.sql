-- Create questions table to allow counselors to manage check-in questionnaire
CREATE TABLE IF NOT EXISTS questions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  text text NOT NULL,
  category text NOT NULL DEFAULT '',
  category_icon text NOT NULL DEFAULT '',
  type text NOT NULL CHECK (type IN ('yesno', 'text')) DEFAULT 'yesno',
  optional boolean NOT NULL DEFAULT false,
  crisis boolean NOT NULL DEFAULT false,
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read questions (students need to fetch them for check-in)
CREATE POLICY "Authenticated users can read questions" ON questions
  FOR SELECT TO authenticated USING (true);

-- Only counselors can insert, update, or delete questions
CREATE POLICY "Counselors can manage questions" ON questions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'counselor')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'counselor')
  );

-- Seed the default 18 questions
INSERT INTO questions (text, category, category_icon, type, optional, crisis, "order") VALUES
  ('Have you experienced physical harm or abuse in your home?',              'Home',                 '🏠', 'yesno', false, true,  1),
  ('Have you ever thought about running away or leaving your home?',          'Home',                 '🏠', 'yesno', false, false, 2),
  ('Have you experienced bullying or physical harm at school or at work?',   'Education & Work',     '📚', 'yesno', false, true,  3),
  ('Have you ever seriously thought about ending your life?',                 'Safety',               '🛡️', 'yesno', false, true,  4),
  ('Do you smoke?',                                                           'Substance Use',        '🚭', 'yesno', false, false, 5),
  ('Do you drink alcohol?',                                                   'Substance Use',        '🚭', 'yesno', false, false, 6),
  ('Have you seen or been exposed to illegal drugs?',                         'Substance Use',        '🚭', 'yesno', false, false, 7),
  ('Have you ever had a boyfriend or girlfriend?',                            'Relationships',        '💙', 'yesno', false, false, 8),
  ('Have you ever had sexual intercourse?',                                   'Reproductive Health',  '💙', 'yesno', false, false, 9),
  ('Have you ever been forced to have sex?',                                  'Reproductive Health',  '💙', 'yesno', false, true,  10),
  ('Have you ever been pregnant or gotten someone pregnant?',                 'Reproductive Health',  '💙', 'yesno', false, false, 11),
  ('Would you like to seek counseling or consultation to help you?',          'Support',              '🤝', 'yesno', false, false, 12),
  ('Have you wished you were dead in the past few weeks?',                    'Mental Health',        '🧠', 'yesno', false, true,  13),
  ('Have you felt that you and your family would be better off if you were gone in the past few weeks?', 'Mental Health', '🧠', 'yesno', false, true, 14),
  ('Have you had thoughts about killing yourself in the past few weeks?',     'Mental Health',        '🧠', 'yesno', false, true,  15),
  ('Have you ever tried to kill yourself?',                                   'Mental Health',        '🧠', 'yesno', false, true,  16),
  ('Are you having thoughts of killing yourself right now?',                  'Mental Health',        '🧠', 'yesno', false, true,  17),
  ('Is there anything you would like your counselor to know?',                'Final Note',           '✉️', 'text',  true,  false, 18);
