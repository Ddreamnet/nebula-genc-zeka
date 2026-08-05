import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveRole } from "@/lib/supabase/types";
import { AuthProvider } from "@/contexts/auth-context";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { TeacherDashboard } from "@/components/dashboard/teacher-dashboard";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/giris");
  }

  // Fetched together server-side so the client AuthProvider below can be
  // seeded once, instead of the browser redoing this exact round trip
  // right after hydration.
  const [{ data: roleRows }, { data: profile }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id),
    supabase.from("profiles").select("user_id, email, full_name").eq("user_id", user.id).single(),
  ]);

  const role = resolveRole((roleRows ?? []).map((r) => r.role));

  if (!role) {
    redirect("/giris");
  }

  const initialRoles = (roleRows ?? []).map((r) => r.role);

  return (
    <AuthProvider initialUser={user} initialProfile={profile ?? null} initialRoles={initialRoles}>
      {role === "admin" && <AdminDashboard />}
      {role === "teacher" && <TeacherDashboard userId={user.id} />}
      {role === "student" && <StudentDashboard userId={user.id} />}
    </AuthProvider>
  );
}
