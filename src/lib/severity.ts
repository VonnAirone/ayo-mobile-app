export type Severity = 'none' | 'medium' | 'high';

// 0 = fine, 1 = medium concern, 2 = high concern
export const MOOD_SCORE: Record<string, number> = {
  '😊 Great': 0,
  '🙂 Good': 0,
  '😐 Okay': 0,
  '😔 Low': 1,
  '😞 Really struggling': 2,
};

export const CONFIDENCE_SCORE: Record<string, number> = {
  'Handling it well': 0,
  'Managing okay': 0,
  'Struggling a bit': 1,
  'Feeling overwhelmed': 2,
};

export const CRISIS_QUESTION_IDS: ReadonlySet<string> = new Set([
  'home_abuse',
  'edu_bullying',
  'safety_suicidal_thoughts',
  'repro_forced',
  'mh_wished_dead',
  'mh_family_better_off',
  'mh_thoughts_killing',
  'mh_tried_kill',
  'mh_current_thoughts',
]);

function scoreToSeverity(score: number): Severity {
  if (score >= 2) return 'high';
  if (score === 1) return 'medium';
  return 'none';
}

interface ScorableAnswer {
  questionId: string;
  answer: string;
  crisis?: boolean;
}

export function isCrisisAnswer(a: ScorableAnswer): boolean {
  // Prefer the denormalized flag saved with the answer; fall back to the
  // legacy hardcoded set for check-ins submitted before the flag was added.
  const flagged = a.crisis ?? CRISIS_QUESTION_IDS.has(a.questionId);
  return flagged && a.answer === 'Yes';
}

export function getAnswerSeverity(a: ScorableAnswer): Severity {
  if (isCrisisAnswer(a)) return 'high';
  if (a.questionId === 'mood') return scoreToSeverity(MOOD_SCORE[a.answer] ?? 0);
  if (a.questionId === 'confidence') return scoreToSeverity(CONFIDENCE_SCORE[a.answer] ?? 0);
  if (a.answer === 'Yes') return 'medium';
  return 'none';
}
