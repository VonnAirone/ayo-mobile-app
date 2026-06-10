// Scaling-based well-being scoring.
//
// Each scaling question is answered on a 5-point frequency scale. Questions are
// worded positively, so a higher frequency means better well-being:
//   Always = 5 … Never = 1
//
// Score    = sum of the points the student chose
// MaxScore = (number of scaling questions answered) × 5
// Percent  = round((Score ÷ MaxScore) × 100)
//
// The percentage maps to one of three moods (see moodFromPercentage).

export interface ScaleOption {
  label: string;
  points: number;
}

export const SCALE_OPTIONS: ReadonlyArray<ScaleOption> = [
  { label: 'Always', points: 5 },
  { label: 'Often', points: 4 },
  { label: 'Sometimes', points: 3 },
  { label: 'Rarely', points: 2 },
  { label: 'Never', points: 1 },
];

export const SCALE_POINTS: Record<string, number> = Object.fromEntries(
  SCALE_OPTIONS.map((o) => [o.label, o.points])
);

export type MoodKey = 'struggling' | 'okay' | 'happy';

export interface MoodInfo {
  key: MoodKey;
  label: string;
  emoji: string;
  /** Short supportive line shown to the student on the result screen. */
  message: string;
  /** Default reflection prompts, used when none are configured in the DB. */
  reflectionQuestions: string[];
}

export const MOODS: Record<MoodKey, MoodInfo> = {
  happy: {
    key: 'happy',
    label: 'Happy / Doing Well',
    emoji: '😊',
    message: "You seem to be doing well right now. That's wonderful — keep it up.",
    reflectionQuestions: [
      'What are some things that have been helping you feel positive and motivated lately?',
      'What activities, habits, or people have contributed most to your well-being?',
      'How do you usually cope with challenges or stress in a healthy way?',
    ],
  },
  okay: {
    key: 'okay',
    label: 'Okay / Needs Attention',
    emoji: '😐',
    message: 'You seem to be managing, but a few things may be weighing on you.',
    reflectionQuestions: [
      'What has been the biggest source of stress or concern for you recently?',
      'What changes or support do you think could help improve your well-being?',
      'Is there anything you would like teachers, family members, or friends to understand about how you are feeling?',
    ],
  },
  struggling: {
    key: 'struggling',
    label: 'Struggling / Needs Support',
    emoji: '😟',
    message: "It looks like things have been hard lately. You're not alone — support is here.",
    reflectionQuestions: [
      'What challenges or difficulties have been affecting you the most recently?',
      'What kind of support or assistance do you think would help you right now?',
      'Is there anything you would like to share with a guidance counselor or trusted adult that was not covered in this questionnaire?',
    ],
  },
};

export interface ScoreResult {
  score: number;
  maxScore: number;
  percentage: number;
}

interface ScorableAnswer {
  answer: string;
}

/**
 * Sums the points for every answer that matches a scale option. Answers that
 * are not on the scale (e.g. blank or free-text reflection answers) are ignored
 * and excluded from the max, keeping the percentage accurate for any question count.
 */
export function computeScore(answers: ScorableAnswer[]): ScoreResult {
  let score = 0;
  let answered = 0;
  for (const a of answers) {
    const pts = SCALE_POINTS[a.answer];
    if (pts !== undefined) {
      score += pts;
      answered += 1;
    }
  }
  const maxScore = answered * 5;
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  return { score, maxScore, percentage };
}

export function moodFromPercentage(percentage: number): MoodKey {
  if (percentage <= 33) return 'struggling';
  if (percentage <= 66) return 'okay';
  return 'happy';
}

export function moodFromKey(key: string | null | undefined): MoodInfo | null {
  if (key && key in MOODS) return MOODS[key as MoodKey];
  return null;
}
