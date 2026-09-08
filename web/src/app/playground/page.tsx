import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readBalance } from "@/lib/playground/balance";
import { listChats } from "@/lib/playground/chats";
import { Playground } from "@/components/playground/playground";
import { weekNumberSince } from "@/lib/lesson/week-number";

export const metadata: Metadata = {
  title: "Playground",
  description: "Nebula Genç Zeka Playground — yapay zekayı hemen dene.",
};

export default async function PlaygroundPage() {
  const supabase = await createClient();

  // getClaims, not getUser: the session token is verified locally against the
  // project's signing key instead of being sent to the auth server and back.
  // That round trip was the single largest fixed cost of opening this page.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  // Signed-in accounts only — anonymous/public access was removed, not merely
  // bypassed. Students, teachers and admins all reach the Playground.
  if (!claims || claims.is_anonymous === true) {
    redirect("/giris");
  }
  const userId = claims.sub;

  // Everything the first paint needs, in one parallel batch on the server:
  // the balance for the bar, the chat list for the history panel, the name
  // for the avatar, the week for the subline. The client used to ask for the
  // first two itself right after mounting — two more round trips, each one
  // re-checking the session, before the header stopped showing placeholders.
  //
  // The admin's treasury figure (a call out to OpenRouter) is deliberately
  // NOT awaited here; the client refreshes it once mounted. Holding the whole
  // page for a third-party API would make the slowest account the slowest
  // page.
  const [balance, chats, { data: profile }, { data: studentRows }] = await Promise.all([
    readBalance(supabase, userId, { treasury: false }),
    listChats(supabase),
    supabase.from("profiles").select("full_name").eq("user_id", userId).maybeSingle(),
    supabase.from("students").select("created_at").eq("student_id", userId).order("created_at").limit(1),
  ]);

  // Weeks since the `students` row was created — the same anchor the student
  // dashboard counts from, so the two never disagree.
  const weekNumber = weekNumberSince(studentRows?.[0]?.created_at);

  return (
    <Playground
      initial={{
        balance: balance.balance,
        unlimited: balance.unlimited,
        role: balance.role,
        balanceStale: balance.stale === true,
        chats: chats ?? [],
        name: profile?.full_name ?? "",
        weekNumber,
      }}
    />
  );
}
