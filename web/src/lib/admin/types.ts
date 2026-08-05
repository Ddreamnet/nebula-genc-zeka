/** Domain types shared by the admin panel's teacher/student views. */

export interface StudentLessonBase {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  note?: string | null;
}

export interface StudentProfile {
  full_name: string;
  email: string;
}

export interface Student {
  id: string;
  student_id: string;
  lessons: StudentLessonBase[];
  is_archived: boolean;
  about_text: string | null;
  profiles: StudentProfile;
  group_id?: string | null;
}

export interface Group {
  id: string;
  teacher_id: string;
  name: string;
}

export interface Teacher {
  user_id: string;
  full_name: string;
  email: string;
  students: Student[];
  groups?: Group[];
}

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  resource_url: string;
  order_index: number;
  is_completed?: boolean;
  completed_at?: string | null;
  group_link_id?: string | null;
}

export interface Topic {
  id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  completed_at?: string | null;
  order_index: number;
  resources: Resource[];
  isGlobal?: boolean;
  group_link_id?: string | null;
}

export const DAYS_OF_WEEK = [
  { value: 1, label: "Pazartesi" },
  { value: 2, label: "Salı" },
  { value: 3, label: "Çarşamba" },
  { value: 4, label: "Perşembe" },
  { value: 5, label: "Cuma" },
  { value: 6, label: "Cumartesi" },
  { value: 0, label: "Pazar" },
] as const;

