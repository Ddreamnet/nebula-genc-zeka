"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { resolveRole, type AppRole, type Profile } from "@/lib/supabase/types";

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  /** Server-fetched seed data (e.g. from dashboard/page.tsx) — lets the
   * initial paint show the real user/profile instead of a blank flash
   * while the client-side session check below is still in flight. */
  initialUser?: User | null;
  initialProfile?: Profile | null;
  initialRoles?: AppRole[];
}

export function AuthProvider({
  children,
  initialUser = null,
  initialProfile = null,
  initialRoles = [],
}: AuthProviderProps) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [roles, setRoles] = useState<AppRole[]>(initialRoles);
  const [loading, setLoading] = useState(!initialUser);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile(userId: string) {
      const [{ data: profileRow }, { data: roleRows }] = await Promise.all([
        supabase.from("profiles").select("user_id, email, full_name").eq("user_id", userId).single(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      if (cancelled) return;
      setProfile(profileRow ?? null);
      setRoles((roleRows ?? []).map((r) => r.role));
    }

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
      }
      if (!cancelled) setLoading(false);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      roles,
      role: resolveRole(roles),
      loading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      signOut: async () => {
        try {
          // "local" scope clears the session immediately without waiting on a
          // round-trip to Supabase's /logout endpoint — a slow or flaky
          // connection must never leave a student stuck on the dashboard
          // with a permanently-disabled "Çıkış" button.
          await supabase.auth.signOut({ scope: "local" });
        } catch {
          // Even if clearing the session errors, still take them to /giris.
        } finally {
          // Hard navigation, not router.push: guarantees a clean reload
          // through the middleware rather than trusting a soft nav to see
          // the just-cleared cookies before it fires.
          window.location.href = "/giris";
        }
      },
    }),
    [user, profile, roles, loading, supabase],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
