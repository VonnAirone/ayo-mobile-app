export type Priority = 'routine' | 'follow_up' | 'urgent';
export interface PriorityReview {
  id: string;
  student_id: string;
  reviewer_id: string;
  priority: Priority;
  rationale: string;
  created_at: string;
}
export const PRIORITY_LABELS: Record<Priority, string> = {
  routine: 'Routine', follow_up: 'Follow-up needed', urgent: 'Urgent follow-up',
};
export function reviewIsCurrent(review: PriorityReview | undefined, latestCheckIn: string | undefined) {
  return !!review && (!latestCheckIn || new Date(review.created_at).getTime() >= new Date(latestCheckIn).getTime());
}
