
  # Ayo Mobile App

  This is a code bundle for Ayo Mobile App. The original project is available at https://www.figma.com/design/sfHN50DNFq8koOfLQz7hDG/Ayo-Mobile-App.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

## Mood tracking

Apply `supabase/migrations/005_mood_entries.sql` to the project's Supabase database
before using mood tracking. It adds a separate `mood_entries` table; existing
questionnaire results are preserved and are not relabeled as self-reported moods.
Students can insert and read their own entries. Counselors can read entries using
the app's existing `profiles.role = 'counselor'` permission model. Anonymous users
have no access. This assumes profile roles are protected from student modification.

Students record a mood and an optional note (up to 1,000 characters) on Home.
History and counselor student details show the last 7, 30, or 90 calendar days,
including today in the viewer's local timezone. Summaries count low entries,
changes between consecutive entries, and the longest run of low entries. Multiple
entries per day are allowed; counts represent entries, not days or diagnoses.

Run calculation checks with `node --test tests/moodHistory.test.mjs` (Node 22.18+).
After migration, verify with student and counselor accounts: save a mood, reload
History, open that student's counselor detail, and confirm another student cannot
read or insert entries for that student. Also verify signed-out access is denied.
