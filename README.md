
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

Mood summaries use existing `check_ins` records, including the mood fields from
migration 004. There is no separate mood-entry form or additional migration needed.
Migration 005 is retained because it was previously applied; its `mood_entries`
table is no longer used by the app. Existing data in that table is preserved.

Run calculation checks with `node --test tests/moodHistory.test.mjs` (Node 22.18+).
