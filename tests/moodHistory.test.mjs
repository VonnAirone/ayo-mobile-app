import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeMoods } from '../src/lib/moodHistory.ts';

const entry = (id, mood, day) => ({ id, mood, note: null, created_at: `2026-09-${day}T12:00:00Z` });

test('empty history has no inferred pattern', () => {
  assert.deepEqual(summarizeMoods([]), { total: 0, low: 0, changes: 0, longestLowRun: 0 });
});
test('sorts newest-first history chronologically without mutating it', () => {
  const entries = [entry('4', 'happy', '17'), entry('3', 'struggling', '16'), entry('2', 'struggling', '15'), entry('1', 'okay', '14')];
  const original = structuredClone(entries);
  assert.deepEqual(summarizeMoods(entries), { total: 4, low: 2, changes: 2, longestLowRun: 2 });
  assert.deepEqual(entries, original);
});
test('a single low entry is counted without inferring a change', () => {
  assert.deepEqual(summarizeMoods([entry('1', 'struggling', '17')]), { total: 1, low: 1, changes: 0, longestLowRun: 1 });
});
test('interrupted low moods are separate runs, including same-day entries', () => {
  assert.deepEqual(summarizeMoods([
    entry('1', 'struggling', '17'), entry('2', 'okay', '17'), entry('3', 'struggling', '17'),
  ]), { total: 3, low: 2, changes: 2, longestLowRun: 1 });
});

const { checkInPercentage, filterCheckIns, summarizeCheckIns } = await import('../src/lib/moodHistory.ts');
const checkIn = (date, score, maxScore, mood = 'happy') => ({ date, score, maxScore, mood });

test('invalid and absent scores are not treated as zero', () => {
  for (const [score, maxScore] of [[null, 50], [0, 0], [51, 50], [-1, 50], [NaN, 50], [20, Infinity]]) {
    assert.equal(checkInPercentage({ score, maxScore }), null);
  }
  assert.equal(checkInPercentage({ score: 33, maxScore: 50 }), 66);
});
test('average gives each check-in equal weight across questionnaire lengths', () => {
  const result = summarizeCheckIns([
    checkIn('2026-09-18', 50, 50), checkIn('2026-09-17', 5, 10, 'okay'), checkIn('2026-09-16', null, null, null),
  ]);
  assert.equal(result.average, 75);
  assert.equal(result.change, 50);
  assert.equal(result.moodCount, 2);
  assert.equal(result.scoredCount, 2);
  assert.deepEqual(result.counts, { happy: 1, okay: 1, struggling: 0 });
});
test('comparison does not skip an unscored check-in or assume one entry is a trend', () => {
  const entries = [checkIn('2026-09-16', 30, 50), checkIn('2026-09-17', null, null), checkIn('2026-09-18', 40, 50)];
  assert.equal(summarizeCheckIns(entries).change, null);
  assert.equal(summarizeCheckIns(entries.slice(-1)).change, null);
  assert.equal(summarizeCheckIns([]).average, null);
});
test('range includes local start of first day, excludes future entries, and sorts newest first', () => {
  const now = new Date(2026, 8, 18, 12);
  const dates = [new Date(2026, 8, 12), new Date(2026, 8, 11, 23, 59), new Date(2026, 8, 18, 11), new Date(2026, 8, 19)];
  const entries = dates.map((date) => checkIn(date.toISOString(), 40, 50));
  assert.deepEqual(filterCheckIns(entries, 7, now), [entries[2], entries[0]]);
  assert.equal(filterCheckIns(entries, 0, now).length, 3);
});
