import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
};

const Ctx = createContext<AuthState>({
  session: null,
  user: null,
  isAdmin: false,
  isSuperAdmin: false,
  loading: true,
});

export function AuthProvider({ libraryId, children }: { libraryId: string | null; children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkRoles(userId: string) {
      const [{ data: superRow }, adminRowResp] = await Promise.all([
        supabase
          .from("super_admins")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle(),
        libraryId
          ? supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", userId)
              .eq("role", "admin")
              .eq("library_id", libraryId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (!mounted) return;
      const sa = !!superRow;
      setIsSuperAdmin(sa);
      setIsAdmin(sa || !!(adminRowResp as any)?.data);
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) checkRoles(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) {
        setTimeout(() => checkRoles(s.user.id), 0);
      } else {
        setIsAdmin(false);
        setIsSuperAdmin(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [libraryId]);

  return (
    <Ctx.Provider
      value={{ session, user: session?.user ?? null, isAdmin, isSuperAdmin, loading }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
