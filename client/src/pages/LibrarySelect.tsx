import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2 } from "lucide-react";
import { Link } from "wouter";

export default function LibrarySelect() {
  const { data: libraries = [], isLoading } = useQuery({
    queryKey: ["libraries-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("libraries")
        .select("id, slug, name, city, state, description")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container h-16 flex items-center gap-3">
          <img
            src="/acerva-logo.png"
            alt="ACERVA"
            className="h-10 w-10 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div>
            <div className="font-serif text-lg leading-tight" style={{ fontWeight: 600 }}>
              ACERVA
            </div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Catálogo digital de bibliotecas
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="container py-16 md:py-24 text-center">
          <img
            src="/acerva-logo.png"
            alt="ACERVA"
            className="h-20 w-20 mx-auto mb-6 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <h1 className="font-serif text-4xl md:text-5xl mb-4">
            Biblioteca pública, na palma da mão
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Consulte o acervo, reserve livros, acompanhe empréstimos. Sem precisar ir até a
            biblioteca.
          </p>
        </section>

        <section className="container pb-16">
          <h2 className="font-serif text-2xl mb-6">Bibliotecas disponíveis</h2>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : libraries.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma biblioteca cadastrada ainda.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {libraries.map((lib) => (
                <Link
                  key={lib.id}
                  href={`/${lib.slug}`}
                  className="group rounded-xl border bg-card p-6 hover:border-primary hover:shadow-md transition"
                >
                  <div className="font-serif text-xl mb-1">{lib.name}</div>
                  {lib.city && (
                    <div className="text-sm text-muted-foreground mb-3">
                      {lib.city}, {lib.state}
                    </div>
                  )}
                  {lib.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                      {lib.description}
                    </p>
                  )}
                  <Button variant="ghost" size="sm" className="gap-1 px-0 hover:bg-transparent">
                    Acessar
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} ACERVA — Catálogo digital de bibliotecas
      </footer>
    </div>
  );
}
