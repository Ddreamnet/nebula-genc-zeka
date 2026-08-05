import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Playground } from "@/components/playground/playground";

export const metadata: Metadata = {
  title: "Playground",
  description: "Nebula Genç Zeka Playground — yapay zekayı hemen dene.",
};

export default async function PlaygroundPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Temporary: Playground is student-only for now, no anonymous/public access.
  if (!user || user.is_anonymous) {
    redirect("/giris");
  }

  return <Playground />;
}
