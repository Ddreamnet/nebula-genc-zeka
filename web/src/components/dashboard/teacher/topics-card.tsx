"use client";

import { useEffect, useState } from "react";
import { BookOpen, Check, ChevronDown, ExternalLink, Library } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getResourceIcon } from "@/lib/admin/resource-icon";
import { useGroupTopics, type GroupTopic, type GroupResource } from "@/lib/lesson/use-group-topics";
import { toggleTopicCompletion as toggleTopicCompletionRpc } from "@/lib/lesson/service";
import { cn } from "@/lib/cn";
import { TopicStatusPill, TopicsProgress } from "../topic-status";

interface Member {
  id: string;
  student_id: string;
  profiles: { full_name: string; email: string };
}

interface Props {
  members: Member[];
  /** Grup satırıysa grubun adı — başlıkta öğrencinin yerine bu geçer. */
  groupName?: string;
  onOpenLibrary: () => void;
}

/** Konu durumunun üç tonu. Sıra sayılara değil, KONUNUN kendi durumuna bağlı:
 *  bitti · şu an çalışılan (ilk bitmemiş) · sırada. */
const TONE = {
  done: { tone: "var(--pn-mint-ink)", dot: "var(--pn-mint)", bg: "var(--color-surface-container)", line: "var(--pn-hair)" },
  current: { tone: "var(--pn-peach-ink)", dot: "var(--pn-peach)", bg: "var(--pn-peach-sel)", line: "var(--pn-peach-line)" },
  next: { tone: "var(--color-on-surface-variant)", dot: "var(--pn-blue-tint)", bg: "var(--color-surface-container)", line: "var(--pn-hair)" },
} as const;

/**
 * Konular kartı.
 *
 * Konular bir NAVİGASYON ÖĞESİ DEĞİL, seçili öğrencinin içeriğidir: öğrenciye
 * tıklamak zaten konuları getiriyorsa ayrı bir "Konular" sekmesi aynı yere
 * giden ikinci bir kapı olurdu. Bu yüzden kart hep burada, seçili öğrenciyi
 * izleyerek durur.
 *
 * Satır genişliği daraldığında (yan panel açılınca) kaynak sayısı ve açıklama
 * satırdan kalkar — konteyner sorgusuyla, bir prop'la değil: kart neden
 * daraldığını bilmek zorunda değil, yalnızca ne kadar yerinin kaldığını.
 */
export function TopicsCard({ members, groupName, onOpenLibrary }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { topics, loading, refetch } = useGroupTopics(members.map((m) => m.student_id));

  const memberKey = members.map((m) => m.student_id).join(",");
  useEffect(() => {
    refetch();
    setExpanded(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberKey]);

  const heading = groupName ?? members[0]?.profiles.full_name ?? "";
  const done = topics.filter((t) => t.is_completed).length;
  const firstOpenIndex = topics.findIndex((t) => !t.is_completed);

  async function upsertCompletion(studentId: string, resourceId: string, isCompleted: boolean) {
    const supabase = createClient();
    return supabase.from("student_resource_completion").upsert(
      {
        student_id: studentId,
        resource_id: resourceId,
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id,resource_id" },
    );
  }

  async function toggleResource(resource: GroupResource, isCompleted: boolean, ownerStudentId: string, isGlobal: boolean) {
    const next = !isCompleted;
    try {
      if (isGlobal) {
        // Global kaynak her öğrenci için AYNI satırdır — tamamlanma her grup
        // üyesinin kendi satırına ayrı ayrı yazılır.
        const results = await Promise.all(members.map((m) => upsertCompletion(m.student_id, resource.id, next)));
        const failed = results.find((r) => r.error);
        if (failed?.error) throw failed.error;
      } else {
        const otherMemberId = members.find((m) => m.student_id !== ownerStudentId)?.student_id;
        const writes = [upsertCompletion(ownerStudentId, resource.id, next)];
        if (resource.siblingResourceId && otherMemberId) {
          writes.push(upsertCompletion(otherMemberId, resource.siblingResourceId, next));
        }
        const results = await Promise.all(writes);
        const failed = results.find((r) => r.error);
        if (failed?.error) throw failed.error;
      }
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "İşlem başarısız");
    }
  }

  async function toggleTopic(topic: GroupTopic) {
    const next = !topic.is_completed;
    try {
      if (topic.isGlobal) {
        const results = await Promise.all(
          members.flatMap((m) => topic.resources.map((r) => upsertCompletion(m.student_id, r.id, next))),
        );
        const failed = results.find((r) => r.error);
        if (failed?.error) throw failed.error;
      } else {
        // Sunucu tarafındaki RPC canlı bağlı grup kardeşine tek işlemde
        // zaten yayıyor — burada ayrıca dağıtmaya gerek yok.
        const result = await toggleTopicCompletionRpc(topic.id, next);
        if (!result.success) throw new Error(result.error ?? "İşlem başarısız");
      }
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "İşlem başarısız");
    }
  }

  return (
    <section className="pn-card min-h-0 flex-1" aria-label={`${heading} için konular`}>
      <div className="pn-band pn-band--pink gap-3 lg:py-3">
        <div className="flex min-w-0 shrink-0 flex-col">
          <h2 className="pn-card-title">Konular</h2>
          {members.length > 1 && <p className="pn-card-sub truncate">{heading} · {members.length} öğrenci</p>}
        </div>
        <TopicsProgress done={done} total={topics.length} />
        <button
          type="button"
          onClick={onOpenLibrary}
          title="Konu kütüphanesi"
          className="pn-btn pn-btn--sm pn-btn--blue shrink-0"
        >
          <Library className="size-4" strokeWidth={1.9} aria-hidden />
          Kütüphane
        </button>
      </div>

      <div className="pn-scroll @container flex min-h-0 flex-1 flex-col gap-2 p-3">
        {/* Yalnızca liste henüz BOŞKEN iskelet: bir yeniden okuma sırasında dolu listenin üstünde beliren boş bir blok, konuların bir anlığına aşağı kaymasına yol açıyordu. */}
        {loading && topics.length === 0 && <div className="h-16 animate-pulse rounded-[12px] bg-[color:var(--pn-blue-tint)]" />}

        {!loading && topics.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
            <BookOpen className="size-8 text-outline" strokeWidth={1.5} aria-hidden />
            <p className="text-[13px] text-on-surface-variant">Bu öğrenci için henüz konu yok.</p>
          </div>
        )}

        {topics.map((topic, index) => {
          const state = topic.is_completed ? "done" : index === firstOpenIndex ? "current" : "next";
          const style = TONE[state];
          const isOpen = expanded.has(topic.id);

          return (
            <div
              key={topic.id}
              className="rounded-[12px] border border-l-[3px]"
              style={{ background: style.bg, borderColor: style.line, borderLeftColor: style.tone }}
            >
              <div className="flex items-center gap-3 px-3 py-2">
                <button
                  type="button"
                  onClick={() => toggleTopic(topic)}
                  aria-label={topic.is_completed ? `${topic.title} — tamamlanmadı yap` : `${topic.title} — tamamlandı yap`}
                  aria-pressed={topic.is_completed}
                  className="grid size-[22px] shrink-0 place-items-center rounded-full border-[1.5px] transition-transform duration-[.18s] hover:scale-110"
                  style={{ background: style.dot, borderColor: style.tone }}
                >
                  <Check
                    className="size-2.5"
                    strokeWidth={3}
                    style={{ color: topic.is_completed ? style.tone : "rgba(21,35,67,.22)" }}
                  />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      if (next.has(topic.id)) next.delete(topic.id);
                      else next.add(topic.id);
                      return next;
                    })
                  }
                  aria-expanded={isOpen}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="min-w-0 flex-1 truncate py-0.5 text-[14px] font-semibold text-on-surface">{topic.title}</span>
                  <TopicStatusPill state={state} />
                  {/* Kaynak sayısı ve durum hapı yalnızca yer varken: yan panel
                      açılıp kart daralınca önce hap, sonra sayı düşer. */}
                  {topic.resources.length > 0 && (
                    <span
                      className="hidden shrink-0 font-mono text-[11px] font-semibold tabular-nums text-on-surface-variant @[340px]:inline"
                    >
                      {topic.resources.length} kaynak
                    </span>
                  )}
                  <ChevronDown
                    className={cn("size-3.5 shrink-0 text-on-surface-variant transition-transform duration-[.18s]", isOpen && "rotate-180")}
                    strokeWidth={2}
                    aria-hidden
                  />
                </button>
              </div>

              <div className="pn-expand" data-open={isOpen} inert={!isOpen}>
                <div>
                <div className="flex flex-col gap-1 border-t border-[color:var(--pn-hair)] p-2">
                  {topic.resources.length === 0 ? (
                    <p className="px-1.5 py-2 text-[12px] text-on-surface-variant">Bu konuda henüz kaynak yok.</p>
                  ) : (
                    topic.resources.map((resource) => (
                      <div key={resource.id} className="flex items-center gap-2 rounded-[10px] bg-[color:var(--pn-blue-tint)] p-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            toggleResource(resource, resource.is_completed ?? false, topic.ownerStudentId, topic.isGlobal ?? false)
                          }
                          aria-label={`${resource.title} — ${resource.is_completed ? "tamamlanmadı" : "tamamlandı"} yap`}
                          aria-pressed={resource.is_completed ?? false}
                          className="grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px] border-[color:var(--pn-mint-ink)]"
                          style={{ background: resource.is_completed ? "var(--pn-mint)" : "transparent" }}
                        >
                          <Check
                            className="size-2.5"
                            strokeWidth={3}
                            style={{ color: resource.is_completed ? "var(--pn-mint-ink)" : "rgba(21,35,67,.2)" }}
                          />
                        </button>
                        {getResourceIcon(resource.resource_type)}
                        {/* Tek bağlantı: orta tık, "yeni sekmede aç" ve ekran
                            okuyucu bir <a> üzerinde çalışır, window.open
                            çağıran bir <div> üzerinde çalışmaz. */}
                        <a
                          href={resource.resource_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group/res min-w-0 flex-1 no-underline"
                        >
                          <p className="truncate text-[12px] font-semibold text-on-surface group-hover/res:underline">
                            {resource.title}
                          </p>
                        </a>
                        <ExternalLink className="size-3 shrink-0 text-outline" aria-hidden />
                      </div>
                    ))
                  )}
                </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
