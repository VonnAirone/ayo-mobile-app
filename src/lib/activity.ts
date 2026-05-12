import { supabase } from './supabase';

export type ActivityType = 'signup' | 'login' | 'checkin' | 'crisis';

export async function logActivity(
  studentId: string,
  type: ActivityType,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await supabase.from('activity_events').insert({
    student_id: studentId,
    type,
    metadata,
  });
  if (error) {
    console.error(`Failed to log ${type} activity:`, error.message);
  }
}
