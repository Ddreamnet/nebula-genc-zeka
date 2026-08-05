"use client";

/**
 * Merges up to 2 group members' independent topic lists (each fetched via
 * the existing, unmodified useStudentTopics hook — the student's own
 * read-only view depends on that hook staying untouched) into one display
 * list for the teacher panel's group row. Topics/resources authored for a
 * group share a `group_link_id` tag (set once at authoring time, never
 * rewritten retroactively — see the group lesson feature migration); this
 * hook re-derives the sibling pairing itself rather than trusting the tag
 * alone, since a topic's owning student may no longer be in the same live
 * group by the time it's viewed.
 *
 * Solo rows (a single member) flow through the same hook with the second
 * slot left undefined, so teacher-student-topics.tsx has one code path for
 * both solo and group display.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStudentTopics } from "./use-student-topics";
import type { Topic, Resource } from "@/lib/admin/types";

export interface GroupResource extends Resource {
  /** The sibling member's resource id, if this resource was authored for a group. */
  siblingResourceId?: string;
}

export interface GroupTopic extends Topic {
  /** Which member's own topics row this display entry came from. */
  ownerStudentId: string;
  resources: GroupResource[];
}

interface UseGroupTopicsReturn {
  topics: GroupTopic[];
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useGroupTopics(memberStudentIds: (string | undefined)[]): UseGroupTopicsReturn {
  const idA = memberStudentIds[0];
  const idB = memberStudentIds[1];
  const a = useStudentTopics(idA);
  const b = useStudentTopics(idB);

  const [topicLinkMap, setTopicLinkMap] = useState<Map<string, string>>(new Map());
  const [resourceLinkMap, setResourceLinkMap] = useState<Map<string, string>>(new Map());
  const [loadingLinks, setLoadingLinks] = useState(true);

  const fetchLinks = useCallback(async () => {
    if (!idA || !idB) {
      setTopicLinkMap(new Map());
      setResourceLinkMap(new Map());
      setLoadingLinks(false);
      return;
    }
    const supabase = createClient();

    const { data: topicRows } = await supabase
      .from("topics")
      .select("id, group_link_id")
      .in("student_id", [idA, idB])
      .not("group_link_id", "is", null);

    const pairUp = (rows: { id: string; group_link_id: string | null }[]) => {
      const byLink = new Map<string, string[]>();
      for (const row of rows) {
        if (!row.group_link_id) continue;
        const list = byLink.get(row.group_link_id) ?? [];
        list.push(row.id);
        byLink.set(row.group_link_id, list);
      }
      const map = new Map<string, string>();
      for (const ids of byLink.values()) {
        if (ids.length === 2) {
          map.set(ids[0], ids[1]);
          map.set(ids[1], ids[0]);
        }
      }
      return map;
    };

    const nextTopicLinkMap = pairUp(topicRows ?? []);
    setTopicLinkMap(nextTopicLinkMap);

    const topicIds = (topicRows ?? []).map((t) => t.id);
    if (topicIds.length === 0) {
      setResourceLinkMap(new Map());
      setLoadingLinks(false);
      return;
    }

    const { data: resourceRows } = await supabase
      .from("resources")
      .select("id, group_link_id")
      .in("topic_id", topicIds)
      .not("group_link_id", "is", null);

    setResourceLinkMap(pairUp(resourceRows ?? []));
    setLoadingLinks(false);
  }, [idA, idB]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const refetch = useCallback(async () => {
    await Promise.all([a.refetch(), b.refetch(), fetchLinks()]);
  }, [a, b, fetchLinks]);

  const topics = useMemo<GroupTopic[]>(() => {
    const tagged: GroupTopic[] = [
      ...(idA ? a.allTopics.map((t) => ({ ...t, ownerStudentId: idA, resources: t.resources as GroupResource[] })) : []),
      ...(idB ? b.allTopics.map((t) => ({ ...t, ownerStudentId: idB, resources: t.resources as GroupResource[] })) : []),
    ];

    const seen = new Set<string>();
    const result: GroupTopic[] = [];
    for (const topic of tagged) {
      if (seen.has(topic.id)) continue;
      const siblingTopicId = topicLinkMap.get(topic.id);
      if (siblingTopicId) seen.add(siblingTopicId);
      seen.add(topic.id);

      result.push({
        ...topic,
        resources: topic.resources.map((r) => ({ ...r, siblingResourceId: resourceLinkMap.get(r.id) })),
      });
    }

    return result.sort((x, y) => {
      if (x.isGlobal && !y.isGlobal) return 1;
      if (!x.isGlobal && y.isGlobal) return -1;
      return x.order_index - y.order_index;
    });
  }, [a.allTopics, b.allTopics, idA, idB, topicLinkMap, resourceLinkMap]);

  return {
    topics,
    loading: a.loading || b.loading || loadingLinks,
    refetch,
  };
}
