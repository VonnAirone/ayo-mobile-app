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
