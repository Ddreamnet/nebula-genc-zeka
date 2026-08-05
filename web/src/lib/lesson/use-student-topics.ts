"use client";

/**
 * Shared "fetch student topics + global topics + completion status + merge"
 * hook. Used by the teacher's per-student topic view and the student's own
 * read-only topic view.
 */
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { fetchGlobalTopics } from "./global-topics-cache";
import type { Topic, Resource } from "@/lib/admin/types";

interface UseStudentTopicsReturn {
  /** All topics (student-specific + merged global) sorted by order_index */
  allTopics: Topic[];
  /** Only student-specific topics (for CRUD in teacher views) */
  studentOnlyTopics: Topic[];
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useStudentTopics(studentUserId: string | undefined): UseStudentTopicsReturn {
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [studentOnlyTopics, setStudentOnlyTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!studentUserId) return;
    const supabase = createClient();

    try {
      const [studentTopicsRes, globalTopics, completionRes] = await Promise.all([
        supabase.from("topics").select("*, resources (*)").eq("student_id", studentUserId).order("order_index"),
        fetchGlobalTopics(),
        supabase.from("student_resource_completion").select("*").eq("student_id", studentUserId),
      ]);

      if (studentTopicsRes.error) throw studentTopicsRes.error;
      if (completionRes.error) throw completionRes.error;

      const completionMap = new Map<string, { is_completed: boolean; completed_at: string | null }>();
      (completionRes.data ?? []).forEach((c) => {
        completionMap.set(c.resource_id, { is_completed: c.is_completed, completed_at: c.completed_at });
      });

      const processedStudentTopics: Topic[] = (studentTopicsRes.data ?? []).map((topic) => ({
        id: topic.id,
        title: topic.title,
        description: topic.description,
        is_completed: topic.is_completed,
        completed_at: topic.completed_at,
        order_index: topic.order_index,
        isGlobal: false,
        resources: ((topic.resources as Resource[]) ?? [])
          .map((r) => {
            const completion = completionMap.get(r.id);
            return {
              id: r.id,
              title: r.title,
              description: r.description,
              resource_type: r.resource_type,
              resource_url: r.resource_url,
              order_index: r.order_index,
              is_completed: completion?.is_completed ?? false,
              completed_at: completion?.completed_at ?? null,
            } satisfies Resource;
          })
          .sort((a, b) => a.order_index - b.order_index),
      }));

      setStudentOnlyTopics(processedStudentTopics);

      const studentTopicTitles = new Set(processedStudentTopics.map((t) => t.title));

      const processedGlobalTopics: Topic[] = globalTopics
        .filter((topic) => !studentTopicTitles.has(topic.title))
        .map((topic) => {
          const globalResources: Resource[] = ((topic.global_topic_resources as Resource[]) ?? [])
            .map((r) => {
              const completion = completionMap.get(r.id);
              return {
                id: r.id,
                title: r.title,
                description: r.description,
                resource_type: r.resource_type,
                resource_url: r.resource_url,
                order_index: r.order_index,
                is_completed: completion?.is_completed ?? false,
                completed_at: completion?.completed_at ?? null,
              };
            })
            .sort((a, b) => a.order_index - b.order_index);

          const allResourcesCompleted = globalResources.length > 0 && globalResources.every((r) => r.is_completed);

          return {
            id: topic.id,
            title: topic.title,
            description: topic.description,
            is_completed: allResourcesCompleted,
            completed_at: allResourcesCompleted ? new Date().toISOString() : null,
            order_index: topic.order_index,
            resources: globalResources,
            isGlobal: true,
          };
        });

      const combined = [...processedStudentTopics, ...processedGlobalTopics].sort((a, b) => {
        if (a.isGlobal && !b.isGlobal) return 1;
        if (!a.isGlobal && b.isGlobal) return -1;
        return a.order_index - b.order_index;
      });

      setAllTopics(combined);
    } catch {
      toast.error("Konular yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [studentUserId]);

  return { allTopics, studentOnlyTopics, loading, refetch };
}
