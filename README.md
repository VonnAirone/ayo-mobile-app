
  # Ayo Mobile App

  This is a code bundle for Ayo Mobile App. The original project is available at https://www.figma.com/design/sfHN50DNFq8koOfLQz7hDG/Ayo-Mobile-App.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

## Mood tracking

Use **View History** beside **Begin Check-In** on the daily check-in card to view
saved daily check-ins, their dates, calculated moods, and reflection responses.
The History tab opens the same screen. Counselors see the same daily check-in
mood summary and history in student details.

Student history offers 7-day, 30-day, and all-time views. The summary shows the
latest well-being score, change from the previous check-in, average score,
a chart of up to 14 recent check-ins, and the percentage of recorded moods in
each category. Score percentages describe questionnaire points, not happiness
or a diagnosis. Missing scores are excluded from averages and comparisons.
Responses and reflections can be expanded below the summary.

Mood summaries use existing `check_ins` records, including the mood fields from
migration 004. There is no separate mood-entry form or additional migration needed.
Migration 005 is retained because it was previously applied; its `mood_entries`
table is no longer used by the app. Existing data in that table is preserved.

Run calculation checks with `node --test tests/moodHistory.test.mjs` (Node 22.18+).

## Counselor support features

Apply `supabase/migrations/006_counselor_support.sql` once in the Supabase SQL
editor before using Reports, Messages, or counselor priority reviews. This
migration depends on the existing `profiles`, `check_ins`, and `follow_ups`
schema from the running app. It does not use the retired `mood_entries` table.

- **Reports:** counselors choose 7, 30, 90 days or custom inclusive local dates,
  generate a report, and filter to one student. CSV and printable/PDF summaries
  include check-in counts, average questionnaire scores, mood counts, follow-up
  note counts, and the most recent counselor priority as of the end date. The
  print button opens a dedicated export window, preserving the main app's screen
  protection. Notes can be viewed in the individual report; raw notes and
  message text are not included in exports. No appointment table exists yet, so
  appointment reporting is not included. Reports use all pages of available rows
  and show an error rather than partial results when a query fails.
- **Messages:** counselors turn on **Accept new requests** in Messages. Students
  select that counselor from Messages or **Consult a counselor** on Support.
  Each pair has one private conversation. Availability controls new requests;
  it does not close existing conversations or promise an immediate response.
  Inboxes poll every 10 seconds while open and show unread counts. Opening a
  focused conversation marks its loaded incoming messages as read. There are
  no background push, SMS, or email notifications. Text messages are limited to
  4,000 characters, with drafts retained on errors and stable IDs for retries.
- **Priority review:** counselors record Routine, Follow-up needed, or Urgent
  follow-up plus a rationale in student details. Reviews are append-only and
  counselor-only, with reviewer IDs and server timestamps. A current review
  controls the student list/dashboard priority. A newer check-in makes it stale
  and restores a provisional indicator until reviewed again. Existing score
  thresholds have NOT been certified as expert-approved; no diagnosis is made.

### Counselor account provisioning

The old browser-only invite-code check is removed. Migration 006 forces all new
profile rows to start as students and prevents clients from changing account
roles. Existing counselor roles are preserved. A trusted administrator verifies
the professional's account and promotes it using the SQL editor or service-role
backend, for example:

```sql
UPDATE public.profiles SET role = 'counselor' WHERE id = '<verified-account-uuid>';
```

The account should sign out and back in after promotion. Do not put a service-role
key in the frontend. Review the existing counselor accounts before rollout;
the previous browser-side invite code did not enforce authorization server-side.
The new features retain the existing app model in which counselors may review
all students; messages are visible only to their two participants.

### Validation

`node --test tests/*.test.mjs` covers scoring, reporting, date boundaries, CSV
escaping, review freshness, and pagination. `npm run build` checks production
bundling. `node tests/support-ui.mjs` uses installed Playwright and synthetic
records to exercise the report, messaging, and review screens without Supabase.

`tests/support-rls.mjs` runs migration 006 against a disposable PostgreSQL-compatible
PGlite database with representative base-table policies. It checks role protection,
participant isolation, message identity, read receipts, review permissions, and
anonymous access. To run it without adding a project dependency:

```sh
npm install --prefix /tmp/ayo-db-check --no-audit --no-fund @electric-sql/pglite
PGLITE_MODULE=/tmp/ayo-db-check/node_modules/@electric-sql/pglite/dist/index.js node tests/support-rls.mjs
```

After applying migration 006, verify the full flow with two student and two
counselor accounts on your Supabase project. Local database tests cannot validate
unseen policies or triggers already installed on the live project.
