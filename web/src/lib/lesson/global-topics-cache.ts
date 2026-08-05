"use client";

/**
 * Shared, TTL-cached fetch for the "global_topics" catalog (+ its resources).
 * It's rarely-changing, identical for every reader, and was previously
 * re-queried from scratch by every expanded student row (admin panel) and
 * every group member (useStudentTopics) — same pattern as week-cache.ts.
 */
import { createClient } from "@/lib/supabase/client";

export interface GlobalTopicResourceRow {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  resource_url: string;
  order_index: number;
}

export interface GlobalTopicRow {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  global_topic_resources: GlobalTopicResourceRow[];
}

const CACHE_TTL = 60_000; // 1 minute — matches week-cache.ts's convention

let cached: { data: GlobalTopicRow[]; ts: number } | null = null;
let inflight: Promise<GlobalTopicRow[]> | null = null;

async function loadGlobalTopics(): Promise<GlobalTopicRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("global_topics").select("*, global_topic_resources(*)").order("order_index");
  if (error) throw error;
  const rows = (data ?? []) as unknown as GlobalTopicRow[];
  cached = { data: rows, ts: Date.now() };
  return rows;
}

export async function fetchGlobalTopics(): Promise<GlobalTopicRow[]> {
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;
  if (inflight) return inflight;

  inflight = loadGlobalTopics().finally(() => {
    inflight = null;
  });

  return inflight;
}

/** Call after any global_topics/global_topic_resources mutation so the next read is fresh. */
export function clearGlobalTopicsCache(): void {
  cached = null;
  inflight = null;
}
