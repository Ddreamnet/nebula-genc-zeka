/** Map of lesson number (string key) to date string (yyyy-MM-dd) */
export interface LessonDates {
  [key: string]: string;
}

/** Full lesson instance row from the lesson_instances table */
export interface LessonInstance {
  id: string;
  student_id: string;
  teacher_id: string;
  lesson_number: number;
  lesson_date: string;
  start_time: string;
  end_time: string;
  status: string; // 'planned' | 'completed'
  original_date: string | null;
  original_start_time: string | null;
  original_end_time: string | null;
  rescheduled_count: number;
  package_cycle: number;
  is_manual_override?: boolean;
  shift_group_id?: string | null;
  group_id?: string | null;
  created_at?: string;
  updated_at?: string;
}
