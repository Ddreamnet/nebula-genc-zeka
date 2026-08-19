export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          notification_type: string
          push_processing_at: string | null
          push_sent_at: string | null
          student_id: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          notification_type?: string
          push_processing_at?: string | null
          push_sent_at?: string | null
          student_id: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          notification_type?: string
          push_processing_at?: string | null
          push_sent_at?: string | null
          student_id?: string
          teacher_id?: string
        }
        Relationships: []
      }
      ai_generations: {
        Row: {
          created_at: string
          id: string
          modality: string
          openrouter_job_id: string | null
          ore_charged: number
          output_path: string | null
          prompt: string
          provider_model: string
          real_cost_usd: number | null
          status: string
          tool_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          modality: string
          openrouter_job_id?: string | null
          ore_charged: number
          output_path?: string | null
          prompt: string
          provider_model: string
          real_cost_usd?: number | null
          status?: string
          tool_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          modality?: string
          openrouter_job_id?: string | null
          ore_charged?: number
          output_path?: string | null
          prompt?: string
          provider_model?: string
          real_cost_usd?: number | null
          status?: string
          tool_id?: string
          user_id?: string
        }
        Relationships: []
      }
      balance_events: {
        Row: {
          amount_minutes: number
          created_at: string
          event_type: string
          id: string
          instance_id: string | null
          notes: string | null
          package_cycle: number | null
          student_id: string | null
          teacher_id: string
        }
        Insert: {
          amount_minutes: number
          created_at?: string
          event_type: string
          id?: string
          instance_id?: string | null
          notes?: string | null
          package_cycle?: number | null
          student_id?: string | null
          teacher_id: string
        }
        Update: {
          amount_minutes?: number
          created_at?: string
          event_type?: string
          id?: string
          instance_id?: string | null
          notes?: string | null
          package_cycle?: number | null
          student_id?: string | null
          teacher_id?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          content: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      global_topic_resources: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          global_topic_id: string
          id: string
          is_completed: boolean | null
          order_index: number
          resource_type: string
          resource_url: string
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          global_topic_id: string
          id?: string
          is_completed?: boolean | null
          order_index?: number
          resource_type: string
          resource_url: string
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          global_topic_id?: string
          id?: string
          is_completed?: boolean | null
          order_index?: number
          resource_type?: string
          resource_url?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_topic_resources_global_topic_id_fkey"
            columns: ["global_topic_id"]
            isOneToOne: false
            referencedRelation: "global_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      global_topics: {
        Row: {
          created_at: string
          description: string | null
          id: string
          order_index: number
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          teacher_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          created_at: string
          id: string
          name: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      homework_submissions: {
        Row: {
          batch_id: string
          created_at: string
          description: string | null
          file_name: string
          file_type: string
          file_url: string
          id: string
          student_id: string
          teacher_id: string
          title: string
          updated_at: string
          uploaded_by_user_id: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          description?: string | null
          file_name: string
          file_type: string
          file_url: string
          id?: string
          student_id: string
          teacher_id: string
          title: string
          updated_at?: string
          uploaded_by_user_id?: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
          student_id?: string
          teacher_id?: string
          title?: string
          updated_at?: string
          uploaded_by_user_id?: string
        }
        Relationships: []
      }
      lesson_instances: {
        Row: {
          created_at: string | null
          end_time: string
          group_id: string | null
          id: string
          is_manual_override: boolean
          lesson_date: string
          lesson_number: number
          original_date: string | null
          original_end_time: string | null
          original_start_time: string | null
          package_cycle: number
          rescheduled_count: number
          shift_group_id: string | null
          start_time: string
          status: string
          student_id: string
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_time: string
          group_id?: string | null
          id?: string
          is_manual_override?: boolean
          lesson_date: string
          lesson_number: number
          original_date?: string | null
          original_end_time?: string | null
          original_start_time?: string | null
          package_cycle?: number
          rescheduled_count?: number
          shift_group_id?: string | null
          start_time: string
          status?: string
          student_id: string
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string
          group_id?: string | null
          id?: string
          is_manual_override?: boolean
          lesson_date?: string
          lesson_number?: number
          original_date?: string | null
          original_end_time?: string | null
          original_start_time?: string | null
          package_cycle?: number
          rescheduled_count?: number
          shift_group_id?: string | null
          start_time?: string
          status?: string
          student_id?: string
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_instances_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_reminder_log: {
        Row: {
          id: string
          lesson_date: string
          lesson_key: string
          recipient_user_id: string
          reminder_type: string
          sent_at: string | null
        }
        Insert: {
          id?: string
          lesson_date: string
          lesson_key: string
          recipient_user_id: string
          reminder_type?: string
          sent_at?: string | null
        }
        Update: {
          id?: string
          lesson_date?: string
          lesson_key?: string
          recipient_user_id?: string
          reminder_type?: string
          sent_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          homework_id: string
          id: string
          is_read: boolean
          push_processing_at: string | null
          push_sent_at: string | null
          recipient_id: string
          student_id: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          homework_id: string
          id?: string
          is_read?: boolean
          push_processing_at?: string | null
          push_sent_at?: string | null
          recipient_id: string
          student_id: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          homework_id?: string
          id?: string
          is_read?: boolean
          push_processing_at?: string | null
          push_sent_at?: string | null
          recipient_id?: string
          student_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homework_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_history: {
        Row: {
          amount_minutes: number
          completed_regular_lessons: number
          completed_trial_lessons: number
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          teacher_id: string
        }
        Insert: {
          amount_minutes: number
          completed_regular_lessons?: number
          completed_trial_lessons?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          teacher_id: string
        }
        Update: {
          amount_minutes?: number
          completed_regular_lessons?: number
          completed_trial_lessons?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          teacher_id?: string
        }
        Relationships: []
      }
      playground_credits: {
        Row: {
          balance_ore: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_ore?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_ore?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      playground_chats: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          last_message_at: string
          message_count: number
          tool_id: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          message_count?: number
          tool_id: string
          user_id?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          message_count?: number
          tool_id?: string
          user_id?: string
        }
        Relationships: []
      }
      playground_chat_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          generation_id: string | null
          id: string
          kind: string
          output_path: string | null
          role: string
          seq: number
          tool_id: string | null
          user_id: string
        }
        Insert: {
          chat_id: string
          content?: string
          created_at?: string
          generation_id?: string | null
          id?: string
          kind?: string
          output_path?: string | null
          role: string
          seq: number
          tool_id?: string | null
          user_id?: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          generation_id?: string | null
          id?: string
          kind?: string
          output_path?: string | null
          role?: string
          seq?: number
          tool_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playground_chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "playground_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          platform: string
          role: string
          student_id: string | null
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          platform: string
          role: string
          student_id?: string | null
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          platform?: string
          role?: string
          student_id?: string | null
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          group_link_id: string | null
          id: string
          is_completed: boolean | null
          order_index: number
          resource_type: string
          resource_url: string
          title: string
          topic_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          group_link_id?: string | null
          id?: string
          is_completed?: boolean | null
          order_index?: number
          resource_type: string
          resource_url: string
          title: string
          topic_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          group_link_id?: string | null
          id?: string
          is_completed?: boolean | null
          order_index?: number
          resource_type?: string
          resource_url?: string
          title?: string
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      student_lesson_tracking: {
        Row: {
          created_at: string | null
          id: string
          lessons_per_week: number
          month_start_date: string
          package_cycle: number
          student_id: string
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lessons_per_week: number
          month_start_date?: string
          package_cycle?: number
          student_id: string
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lessons_per_week?: number
          month_start_date?: string
          package_cycle?: number
          student_id?: string
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      student_lessons: {
        Row: {
          completed_at: string | null
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_completed: boolean
          note: string | null
          start_time: string
          student_id: string
          teacher_id: string
          updated_at: string
          week_start_date: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_completed?: boolean
          note?: string | null
          start_time: string
          student_id: string
          teacher_id: string
          updated_at?: string
          week_start_date?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_completed?: boolean
          note?: string | null
          start_time?: string
          student_id?: string
          teacher_id?: string
          updated_at?: string
          week_start_date?: string
        }
        Relationships: []
      }
      student_resource_completion: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          resource_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          resource_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          resource_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          about_text: string | null
          archived_at: string | null
          created_at: string
          group_id: string | null
          id: string
          is_archived: boolean
          student_id: string
          teacher_id: string
        }
        Insert: {
          about_text?: string | null
          archived_at?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          is_archived?: boolean
          student_id: string
          teacher_id: string
        }
        Update: {
          about_text?: string | null
          archived_at?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          is_archived?: boolean
          student_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "students_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      teacher_balance: {
        Row: {
          completed_regular_lessons: number
          completed_trial_lessons: number
          created_at: string
          id: string
          manual_adjustment_minutes: number
          regular_lessons_minutes: number
          teacher_id: string
          total_minutes: number
          trial_lessons_minutes: number
          updated_at: string
        }
        Insert: {
          completed_regular_lessons?: number
          completed_trial_lessons?: number
          created_at?: string
          id?: string
          manual_adjustment_minutes?: number
          regular_lessons_minutes?: number
          teacher_id: string
          total_minutes?: number
          trial_lessons_minutes?: number
          updated_at?: string
        }
        Update: {
          completed_regular_lessons?: number
          completed_trial_lessons?: number
          created_at?: string
          id?: string
          manual_adjustment_minutes?: number
          regular_lessons_minutes?: number
          teacher_id?: string
          total_minutes?: number
          trial_lessons_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          group_link_id: string | null
          id: string
          is_completed: boolean
          order_index: number
          student_id: string
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          group_link_id?: string | null
          id?: string
          is_completed?: boolean
          order_index?: number
          student_id: string
          teacher_id: string
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          group_link_id?: string | null
          id?: string
          is_completed?: boolean
          order_index?: number
          student_id?: string
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "topics_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      trial_lessons: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_completed: boolean
          lesson_date: string
          start_time: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_completed?: boolean
          lesson_date?: string
          start_time: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_completed?: boolean
          lesson_date?: string
          start_time?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_student_relationship: {
        Args: { student_user_id: string; teacher_user_id: string }
        Returns: Json
      }
      create_student_relationship: {
        Args: { student_user_id: string }
        Returns: Json
      }
      create_student_relationship_internal: {
        Args: { student_user_id: string; teacher_user_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_teacher: { Args: { _user_id: string }; Returns: boolean }
      rpc_admin_add_student_to_group: {
        Args: {
          p_group_id: string
          p_student_record_id: string
          p_teacher_id: string
        }
        Returns: Json
      }
      rpc_admin_add_student_to_group_internal: {
        Args: {
          p_group_id: string
          p_student_record_id: string
          p_teacher_id: string
        }
        Returns: Json
      }
      rpc_admin_archive_student: {
        Args: {
          p_student_record_id: string
          p_student_user_id: string
          p_teacher_id: string
        }
        Returns: Json
      }
      rpc_admin_complete_lesson: {
        Args: { p_instance_id: string; p_teacher_id: string }
        Returns: Json
      }
      rpc_admin_complete_trial_lesson: {
        Args: { p_teacher_id: string; p_trial_id: string }
        Returns: Json
      }
      rpc_admin_create_group: {
        Args: { p_name: string; p_teacher_id: string }
        Returns: Json
      }
      rpc_admin_create_group_internal: {
        Args: { p_name: string; p_teacher_id: string }
        Returns: Json
      }
      rpc_admin_delete_group: {
        Args: { p_group_id: string; p_teacher_id: string }
        Returns: Json
      }
      rpc_admin_delete_group_internal: {
        Args: { p_group_id: string; p_teacher_id: string }
        Returns: Json
      }
      rpc_admin_delete_student: {
        Args: {
          p_student_record_id: string
          p_student_user_id: string
          p_teacher_id: string
        }
        Returns: Json
      }
      rpc_admin_grant_playground_ore: {
        Args: { p_amount: number; p_student_id: string }
        Returns: number
      }
      rpc_admin_remove_student_from_group: {
        Args: { p_student_record_id: string; p_teacher_id: string }
        Returns: Json
      }
      rpc_admin_remove_student_from_group_internal: {
        Args: { p_student_record_id: string; p_teacher_id: string }
        Returns: Json
      }
      rpc_admin_rename_group: {
        Args: { p_group_id: string; p_name: string; p_teacher_id: string }
        Returns: Json
      }
      rpc_admin_rename_group_internal: {
        Args: { p_group_id: string; p_name: string; p_teacher_id: string }
        Returns: Json
      }
      rpc_admin_reset_package: {
        Args: {
          p_student_id: string
          p_teacher_id: string
          p_template_slots: Json
        }
        Returns: Json
      }
      rpc_admin_restore_student: {
        Args: {
          p_student_record_id: string
          p_student_user_id: string
          p_teacher_id: string
        }
        Returns: Json
      }
      rpc_admin_sync_student_schedule: {
        Args: {
          p_lessons_per_week: number
          p_slots: Json
          p_student_id: string
          p_teacher_id: string
        }
        Returns: Json
      }
      rpc_admin_toggle_topic_completion: {
        Args: {
          p_is_completed: boolean
          p_teacher_id: string
          p_topic_id: string
        }
        Returns: Json
      }
      rpc_admin_undo_complete_lesson: {
        Args: { p_instance_id: string; p_teacher_id: string }
        Returns: Json
      }
      rpc_admin_undo_trial_lesson: {
        Args: { p_teacher_id: string; p_trial_id: string }
        Returns: Json
      }
      rpc_archive_student: {
        Args: { p_student_record_id: string; p_student_user_id: string }
        Returns: Json
      }
      rpc_archive_student_internal: {
        Args: {
          p_student_record_id: string
          p_student_user_id: string
          p_teacher_id: string
        }
        Returns: Json
      }
      rpc_attach_video_job: {
        Args: { p_generation_id: string; p_job_id: string }
        Returns: undefined
      }
      rpc_complete_lesson: { Args: { p_instance_id: string }; Returns: Json }
      rpc_complete_lesson_internal: {
        Args: { p_instance_id: string; p_teacher_id: string }
        Returns: Json
      }
      rpc_complete_trial_lesson: { Args: { p_trial_id: string }; Returns: Json }
      rpc_complete_trial_lesson_internal: {
        Args: { p_teacher_id: string; p_trial_id: string }
        Returns: Json
      }
      rpc_delete_student: {
        Args: { p_student_record_id: string; p_student_user_id: string }
        Returns: Json
      }
      rpc_delete_student_internal: {
        Args: {
          p_student_record_id: string
          p_student_user_id: string
          p_teacher_id: string
        }
        Returns: Json
      }
      rpc_finalize_generation: {
        Args: {
          p_generation_id: string
          p_output_path?: string
          p_real_cost_usd?: number
          p_status: string
        }
        Returns: undefined
      }
      rpc_manual_balance_adjust: {
        Args: {
          p_amount_minutes: number
          p_notes?: string
          p_teacher_id: string
        }
        Returns: Json
      }
      rpc_reset_package: {
        Args: { p_student_id: string; p_template_slots: Json }
        Returns: Json
      }
      rpc_reset_package_internal: {
        Args: {
          p_student_id: string
          p_teacher_id: string
          p_template_slots: Json
        }
        Returns: Json
      }
      rpc_restore_student: {
        Args: { p_student_record_id: string; p_student_user_id: string }
        Returns: Json
      }
      rpc_restore_student_internal: {
        Args: {
          p_student_record_id: string
          p_student_user_id: string
          p_teacher_id: string
        }
        Returns: Json
      }
      rpc_append_switch: {
        Args: {
          p_chat_id: string
          p_tool_id: string
        }
        Returns: undefined
      }
      rpc_append_turn: {
        Args: {
          p_chat_id: string | null
          p_generation_id?: string | null
          p_tool_id: string
          p_user_content: string
        }
        Returns: {
          assistant_message_id: string
          chat_id: string
        }[]
      }
      rpc_archive_chat: {
        Args: {
          p_chat_id: string
        }
        Returns: undefined
      }
      rpc_settle_message: {
        Args: {
          p_content?: string
          p_kind?: string
          p_message_id: string
          p_output_path?: string | null
        }
        Returns: undefined
      }
      rpc_start_generation: {
        Args: {
          p_modality: string
          p_ore_cost: number
          p_prompt: string
          p_provider_model: string
          p_tool_id: string
        }
        Returns: {
          error: string
          generation_id: string
          remaining_ore: number
          success: boolean
        }[]
      }
      rpc_sync_student_schedule: {
        Args: {
          p_lessons_per_week: number
          p_slots: Json
          p_student_id: string
        }
        Returns: Json
      }
      rpc_sync_student_schedule_internal: {
        Args: {
          p_lessons_per_week: number
          p_slots: Json
          p_student_id: string
          p_teacher_id: string
        }
        Returns: Json
      }
      rpc_toggle_topic_completion: {
        Args: { p_is_completed: boolean; p_topic_id: string }
        Returns: Json
      }
      rpc_toggle_topic_completion_internal: {
        Args: {
          p_is_completed: boolean
          p_teacher_id: string
          p_topic_id: string
        }
        Returns: Json
      }
      rpc_undo_complete_lesson: {
        Args: { p_instance_id: string }
        Returns: Json
      }
      rpc_undo_complete_lesson_internal: {
        Args: { p_instance_id: string; p_teacher_id: string }
        Returns: Json
      }
      rpc_undo_trial_lesson: { Args: { p_trial_id: string }; Returns: Json }
      rpc_undo_trial_lesson_internal: {
        Args: { p_teacher_id: string; p_trial_id: string }
        Returns: Json
      }
      sync_missing_profiles: { Args: never; Returns: Json }
      teacher_owns_student: {
        Args: { _student_id: string; _teacher_id: string }
        Returns: boolean
      }
      update_global_resources_order: {
        Args: { resource_orders: Json }
        Returns: undefined
      }
      update_global_topics_order: {
        Args: { topic_orders: Json }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "student"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
