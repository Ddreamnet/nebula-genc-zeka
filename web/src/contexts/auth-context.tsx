"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

  /**
   * Whose profile+roles the two pieces of state above are already holding.
   *
   * Without this the mount sequence fetched them THREE times over for a
   * result that never differed: dashboard/page.tsx server-fetches them and
   * seeds this provider, then init() below re-fetched them, and then
   * supabase-js fired its INITIAL_SESSION event on subscribe and the handler
   * re-fetched them a third time. Six queries, four of them round trips the
   * browser sat through before the dashboard could settle — which is
   * precisely the pause after pressing "Giriş Yap". Seeding this ref from
   * the server-provided user makes all of it a no-op.
   */
  const loadedForUserId = useRef<string | null>(initialProfile ? (initialUser?.id ?? null) : null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile(userId: string) {
      const [{ data: profileRow }, { data: roleRows }] = await Promise.all([
        supabase.from("profiles").select("user_id, email, full_name").eq("user_id", userId).single(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      if (cancelled) return;
      loadedForUserId.current = userId;
      setProfile(profileRow ?? null);
      setRoles((roleRows ?? []).map((r) => r.role));
    }

    async function init() {
      // getSession() reads the cookie/local copy, so this is cheap — it is
      // only here to resolve `loading` and to catch a session that changed
      // between the server render and hydration.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      setUser(session?.user ?? null);
      if (session?.user && loadedForUserId.current !== session.user.id) {
        await loadProfile(session.user.id);
      }
      if (!cancelled) setLoading(false);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // TOKEN_REFRESHED swaps the access token and nothing else; INITIAL_SESSION
        // is just supabase-js replaying the session we already rendered with.
        // Neither can have changed profiles/user_roles, so neither is worth a
        // pair of queries. Every other event (SIGNED_IN, USER_UPDATED, ...) still
        // re-reads, so a genuine account switch is picked up exactly as before.
        const replayed =
          (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") &&
          loadedForUserId.current === session.user.id;
        if (!replayed) await loadProfile(session.user.id);
      } else {
        loadedForUserId.current = null;
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
