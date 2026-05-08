import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/PageShell";
import { trpc } from "@/lib/trpc";
import {
  BookOpen,
  CheckCircle2,
  Library,
  Search as SearchIcon,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

export default function Home() {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const categoriesQuery = trpc.catalog.listCategories.useQuery();
  const searchInput = useMemo(
    () => ({ query, categoryId, onlyAvailable }),
    [query, categoryId, onlyAvailable],
  );
  const booksQuery = trpc.catalog.search.useQuery(searchInput);

  const total = booksQuery.data?.length ?? 0;

  return (
    <PageShell>
      {/* Hero */}
      <section className="relative">
        <div className="container pt-10 md:pt-16 pb-8">
          <div className="max-w-3xl">
            <Badge
              variant="outline"
              className="mb-4 border-primary/30 text-primary bg-primary/5"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Catálogo digital · Schroeder/SC
            </Badge>
            <h1
              className="font-serif text-4xl md:text-5xl text-foreground mb-4"
              style={{ fontWeight: 600, lineHeight: 1.05 }}
            >
              O acervo da{" "}
              <span className="italic text-primary">
                Biblioteca Cruz e Sousa
              </span>{" "}
              ao seu alcance.
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl">
              Pesquise livros, acompanhe a disponibilidade em tempo real e faça
              seu cadastro de leitor para retirar obras direto na biblioteca.
            </p>
          </div>

          {/* Search bar */}
          <div className="mt-8 rounded-2xl border bg-card shadow-sm p-3 md:p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <SearchIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Pesquisar por título ou autor (ex.: Machado de Assis, Dom Casmurro)"
                  className="h-14 text-base pl-12 rounded-xl bg-background"
                />
              </div>
              <Button
                size="lg"
                className="h-14 px-6 rounded-xl"
                onClick={() => booksQuery.refetch()}
              >
                Buscar
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setCategoryId(undefined)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  categoryId === undefined
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground/80 hover:bg-accent"
                }`}
              >
                Todas as categorias
              </button>
              {categoriesQuery.data?.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    categoryId === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground/80 hover:bg-accent"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
              <div className="flex-1" />
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={(e) => setOnlyAvailable(e.target.checked)}
                  className="h-4 w-4 accent-[oklch(0.36_0.07_165)]"
                />
                Apenas disponíveis agora
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="container pb-16">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-serif text-2xl text-foreground">
            {booksQuery.isLoading
              ? "Carregando acervo…"
              : total === 0
                ? "Nenhum livro encontrado"
                : `${total} ${total === 1 ? "obra encontrada" : "obras encontradas"}`}
          </h2>
          <span className="hidden md:inline text-xs uppercase tracking-widest text-muted-foreground">
            Atualizado em tempo real
          </span>
        </div>

        {booksQuery.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-5 h-40 bg-muted/50 rounded-xl" />
              </Card>
            ))}
          </div>
        ) : total === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 flex flex-col items-center text-center gap-3">
              <Library className="h-10 w-10 text-muted-foreground" />
              <p className="text-foreground font-medium">
                Nenhum livro encontrado com esses critérios.
              </p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Tente buscar por outro título, autor, ou remova os filtros para
                ver todo o acervo.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setCategoryId(undefined);
                  setOnlyAvailable(false);
                }}
              >
                Limpar filtros
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {booksQuery.data?.map((b) => (
              <Link key={b.id} href={`/livros/${b.id}`}>
                <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40 cursor-pointer">
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      {b.availableCopies > 0 ? (
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/15 border-0">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          {b.availableCopies} de {b.totalCopies} disponível
                          {b.availableCopies > 1 ? "is" : ""}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-destructive/40 text-destructive bg-destructive/5"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Emprestado
                        </Badge>
                      )}
                    </div>
                    <h3
                      className="font-serif text-lg leading-snug text-foreground line-clamp-2"
                      style={{ fontWeight: 600 }}
                    >
                      {b.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {b.author}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-4">
                      {b.category ? (
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">
                          {b.category.name}
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="text-xs font-medium text-primary group-hover:underline">
                        Ver detalhes →
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
