export type AppRole = "admin" | "teacher" | "student";

export interface Profile {
  user_id: string;
  email: string;
  full_name: string | null;
}

/** admin > teacher > student — mirrors the old panel's role priority. */
export function resolveRole(roles: AppRole[]): AppRole | null {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("teacher")) return "teacher";
  if (roles.includes("student")) return "student";
  return null;
}
