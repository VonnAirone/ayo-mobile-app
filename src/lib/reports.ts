import type { MoodKey } from './mood';
import type { PriorityReview } from './priority';

export interface ReportCheckIn { id: string; student_id: string; created_at: string; score: number | null; max_score: number | null; mood: MoodKey | null }
export interface ReportNote { id: string; student_id: string; created_at: string; note: string }
export interface ReportRow {
  id: string; name: string; checkIns: number; average: number | null;
  happy: number; okay: number; struggling: number; followUps: number;
  priority: string; reviewDate: string; reviewNeeded: boolean; noNoteAfterLatest: boolean;
  lastCheckIn: string;
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function reportRange(start: string, end: string) {
  const parse = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Choose valid dates.');
    const date = new Date(`${value}T00:00:00`);
    if (!Number.isFinite(date.getTime()) || localDate(date) !== value) throw new Error('Choose valid dates.');
    return date;
  };
  const from = parse(start), to = parse(end);
  if (from > to) throw new Error('Start date must be on or before end date.');
  if (end > localDate()) throw new Error('End date cannot be in the future.');
  to.setDate(to.getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}
export function buildReport(profiles: { id: string; name: string }[], checkIns: ReportCheckIn[], notes: ReportNote[], reviews: PriorityReview[], from: string, to: string): ReportRow[] {
  const inPeriod = (date: string) => Date.parse(date) >= Date.parse(from) && Date.parse(date) < Date.parse(to);
  return profiles.map((student) => {
    const history = checkIns.filter((item) => item.student_id === student.id && Date.parse(item.created_at) < Date.parse(to)).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    const entries = history.filter((item) => inPeriod(item.created_at));
    const studentNotes = notes.filter((item) => item.student_id === student.id && Date.parse(item.created_at) < Date.parse(to));
    const review = reviews.filter((item) => item.student_id === student.id && Date.parse(item.created_at) < Date.parse(to)).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id.localeCompare(a.id))[0];
    const latest = history[0];
    const scored = entries.filter((entry) => entry.score !== null && entry.max_score !== null && Number.isFinite(entry.score) && Number.isFinite(entry.max_score) && entry.max_score > 0 && entry.score >= 0 && entry.score <= entry.max_score);
    const labels = { routine: 'Routine', follow_up: 'Follow-up needed', urgent: 'Urgent follow-up' };
    return {
      id: student.id, name: student.name, checkIns: entries.length,
      average: scored.length ? Math.round(scored.reduce((sum, entry) => sum + Math.round(entry.score! / entry.max_score! * 100), 0) / scored.length) : null,
      happy: entries.filter((item) => item.mood === 'happy').length,
      okay: entries.filter((item) => item.mood === 'okay').length,
      struggling: entries.filter((item) => item.mood === 'struggling').length,
      followUps: studentNotes.filter((item) => inPeriod(item.created_at)).length,
      priority: review ? labels[review.priority] : 'Not reviewed', reviewDate: review?.created_at ?? '',
      reviewNeeded: !review || !!latest && Date.parse(latest.created_at) > Date.parse(review.created_at),
      noNoteAfterLatest: !!latest && !studentNotes.some((note) => Date.parse(note.created_at) >= Date.parse(latest.created_at)),
      lastCheckIn: latest?.created_at ?? '',
    };
  }).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
export const REPORT_HEADERS = ['Student', 'Student ID', 'Check-ins', 'Average well-being %', 'Happy', 'Okay', 'Struggling', 'Follow-up notes', 'Counselor priority', 'Review date', 'Review needed', 'No note after latest check-in', 'Last check-in'];
export function reportCells(row: ReportRow): (string | number)[] {
  return [row.name, row.id, row.checkIns, row.average ?? '', row.happy, row.okay, row.struggling, row.followUps, row.priority, row.reviewDate, row.reviewNeeded ? 'Yes' : 'No', row.noNoteAfterLatest ? 'Yes' : 'No', row.lastCheckIn];
}
/** Quote every value and neutralize spreadsheet formulas in exported text. */
export function csvCell(value: string | number) {
  let text = String(value);
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function reportCsv(rows: ReportRow[], start: string, end: string, generated: string) {
  return '\uFEFF' + [
    ['Ayo Counselor Report', start, end, generated],
    ['Counts are for the selected dates; priority, review status and latest check-in are as of the report end date. Not a diagnosis.'],
    REPORT_HEADERS, ...rows.map(reportCells),
  ].map((row) => row.map(csvCell).join(',')).join('\r\n');
}
