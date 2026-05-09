import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Library = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  state: string | null;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
};

const Ctx = createContext<{ library: Library | null; loading: boolean; error: string | null }>(
  { library: null, loading: true, error: null },
);

export function LibraryProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [library, setLibrary] = useState<Library | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    supabase
      .from("libraries")
      .select("id, slug, name, city, state, description, logo_url, cover_url")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) setError(error.message);
        else if (!data) setError("Biblioteca não encontrada");
        else setLibrary(data);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [slug]);

  return <Ctx.Provider value={{ library, loading, error }}>{children}</Ctx.Provider>;
}

export function useLibrary(): Library {
  const { library } = useContext(Ctx);
  if (!library) throw new Error("useLibrary must be inside LibraryProvider with a loaded library");
  return library;
}

export function useLibraryState() {
  return useContext(Ctx);
}
