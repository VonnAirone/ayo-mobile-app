import { SCALE_POINTS } from './mood';

export type Severity = 'none' | 'medium' | 'high';

interface ScorableAnswer {
  answer: string;
}

/**
 * Per-answer severity for a scaling response. Low frequency of a positively
 * worded statement signals a concern:
 *   Never / Rarely (1–2) → medium concern, otherwise none.
 * Non-scale answers (free-text reflections) carry no severity.
 */
export function getAnswerSeverity(a: ScorableAnswer): Severity {
  const pts = SCALE_POINTS[a.answer];
  if (pts === undefined) return 'none';
  if (pts <= 2) return 'medium';
  return 'none';
}
