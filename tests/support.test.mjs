import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allPages } from '../src/lib/records.ts';
import { reviewIsCurrent } from '../src/lib/priority.ts';
import { buildReport, reportRange, csvCell, reportCsv } from '../src/lib/reports.ts';

const student = { id: 'student', name: '=SUM(1,2)' };
const checkIn = (id, created_at, score = 40, max_score = 50) => ({ id, student_id: student.id, created_at, score, max_score, mood: 'happy' });
const review = { id: 'r', student_id: student.id, reviewer_id: 'c', created_at: '2026-09-12T12:00:00Z', priority: 'follow_up', rationale: 'Contact student' };

test('reports filter counts by period but retain prior review and latest check-in context', () => {
  const entries = [checkIn('old', '2026-09-01T12:00:00Z'), checkIn('new', '2026-09-15T12:00:00Z'), checkIn('future', '2026-09-20T12:00:00Z')];
  const [row] = buildReport([student], entries, [], [review], '2026-09-14T00:00:00Z', '2026-09-19T00:00:00Z');
  assert.equal(row.checkIns, 1); assert.equal(row.average, 80);
  assert.equal(row.reviewNeeded, true); assert.equal(row.priority, 'Follow-up needed');
  assert.equal(row.noNoteAfterLatest, true);
});
test('unscored check-ins do not reduce averages and missing records do not imply no risk', () => {
  const [row] = buildReport([student], [checkIn('a', '2026-09-15', null, null)], [], [], '2026-09-14', '2026-09-19');
  assert.equal(row.average, null); assert.equal(row.priority, 'Not reviewed'); assert.equal(row.reviewNeeded, true);
  const [empty] = buildReport([student], [], [], [], '2026-09-14', '2026-09-19');
  assert.equal(empty.noNoteAfterLatest, false); assert.equal(empty.lastCheckIn, '');
});
test('follow-up notes and reviews after report end cannot affect historical report', () => {
  const notes = [{ id: 'note', student_id: student.id, created_at: '2026-09-20', note: 'Done' }];
  const [row] = buildReport([student], [checkIn('a', '2026-09-15')], notes, [{ ...review, created_at: '2026-09-20' }], '2026-09-14', '2026-09-19');
  assert.equal(row.followUps, 0); assert.equal(row.noNoteAfterLatest, true); assert.equal(row.priority, 'Not reviewed');
});
test('date range rejects impossible, reversed and future dates', () => {
  assert.throws(() => reportRange('2026-02-30', '2026-03-01'));
  assert.throws(() => reportRange('2026-09-18', '2026-09-17'));
  assert.throws(() => reportRange('2099-01-01', '2099-01-02'));
  const range = reportRange('2026-09-01', '2026-09-01');
  assert.equal(new Date(range.from).getDate(), 1); assert.equal(new Date(range.to).getDate(), 2);
});
test('CSV escapes quotes, commas and spreadsheet formulas', () => {
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
  assert.equal(csvCell(' =SUM(1,2)'), '"\' =SUM(1,2)"');
  assert.equal(csvCell('\tfoo'), '"\'\tfoo"');
  const rows = buildReport([student], [], [], [], '2026-09-01', '2026-09-19');
  assert.ok(reportCsv(rows, '2026-09-01', '2026-09-18', 'now').includes('"\'=SUM(1,2)"'));
});
test('reviews become stale after a newer check-in', () => {
  assert.equal(reviewIsCurrent(review, '2026-09-13'), false);
  assert.equal(reviewIsCurrent(review, '2026-09-11'), true);
  assert.equal(reviewIsCurrent(undefined, '2026-09-11'), false);
});
test('pagination includes more than API default cap and rejects partial failures', async () => {
  const data = Array.from({ length: 1100 }, (_, id) => ({ id }));
  assert.equal((await allPages(async (from, to) => ({ data: data.slice(from, to + 1), error: null }))).length, 1100);
  await assert.rejects(allPages(async (from, to) => from ? { data: null, error: new Error('offline') } : { data: data.slice(from, to + 1), error: null }));
});
test('bounded message pagination stops exactly at the requested limit', async () => {
  let calls = 0;
  const rows = await allPages(async (from, to) => { calls++; assert.ok(to >= from); return { data: Array.from({ length: to - from + 1 }, (_, index) => from + index), error: null }; }, 500);
  assert.equal(rows.length, 500); assert.equal(calls, 1);
});

test('message retry IDs are distinct valid UUIDs', async () => {
  const { messageId } = await import('../src/lib/messages.ts');
  const first = messageId(), second = messageId();
  assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(first, second);
});
