import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PageShell } from "@/components/PageShell";
import { useLibrary } from "@/contexts/LibraryContext";
import {
  listCategories,
  listRecentBooks,
  searchBooks,
  type BookWithCounts,
} from "@/lib/api/books";
import { getMostLoanedBooks, getTopReaders } from "@/lib/api/rankings";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Lightbulb, Search, Sparkles, Star, Trophy } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

type SortKey = "title" | "newest" | "rating" | "popular";

export default function Catalog() {
  const lib = useLibrary();

  return (
    <PageShell>
      <HeroSection />
      <MostLoanedSection />
      <NewArrivalsSection />
      <TopReadersSection />
      <SuggestBookCTA />
      <FullCatalogSection />
    </PageShell>
  );
}

function HeroSection() {
  const lib = useLibrary();
  return (
    <section className="bg-gradient-to-b from-primary/5 to-transparent border-b">
      <div className="container py-10 md:py-14">
        <Badge variant="outline" className="mb-3 border-primary/30 text-primary bg-primary/5">
          <BookOpen className="h-3.5 w-3.5 mr-1.5" />
          Catálogo público
        </Badge>
        <h1 className="font-serif text-3xl md:text-5xl mb-3">{lib.name}</h1>
        {lib.description && (
          <p className="text-muted-foreground max-w-2xl">{lib.description}</p>
        )}
      </div>
    </section>
  );
}

function MostLoanedSection() {
  const lib = useLibrary();
  const { data: books = [], isLoading } = useQuery({
    queryKey: ["most-loaned", lib.id],
    queryFn: () => getMostLoanedBooks(lib.id, 8),
  });

  if (isLoading || books.length === 0) return null;

  return (
    <Section
      icon={<Trophy className="h-4 w-4 text-amber-500" />}
      eyebrow="Os preferidos"
      titleNode={
        <>
          Mais lidos em <span className="text-primary">{lib.city ?? lib.name}</span>
        </>
      }
      action={
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href={`/${lib.slug}/rankings`}>
            Ver ranking completo <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      }
    >
      <Carousel opts={{ align: "start", dragFree: true }} className="relative">
        <CarouselContent className="-ml-3">
          {books.map((b) => (
            <CarouselItem
              key={b.book_id}
              className="pl-3 basis-[45%] sm:basis-[33%] md:basis-[25%] lg:basis-[20%]"
            >
              <Link
                href={`/${lib.slug}/livros/${b.book_id}`}
                className="group rounded-lg border bg-card overflow-hidden hover:border-primary hover:shadow-md transition flex flex-col h-full"
              >
                <div className="aspect-[2/3] bg-muted flex items-center justify-center overflow-hidden relative">
                  {b.cover_url ? (
                    <img
                      src={b.cover_url}
                      alt={b.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <BookOpen className="h-10 w-10 text-muted-foreground/40" />
                  )}
                  <Badge className="absolute top-2 left-2 bg-amber-500 hover:bg-amber-500 text-white border-0">
                    {b.total} empréstimos
                  </Badge>
                </div>
                <div className="p-3">
                  <div className="font-serif text-base leading-snug line-clamp-2 mb-1">
                    {b.title}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{b.author}</div>
                </div>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="-left-3 md:-left-4" />
        <CarouselNext className="-right-3 md:-right-4" />
      </Carousel>
    </Section>
  );
}

function NewArrivalsSection() {
  const lib = useLibrary();
  const { data: books = [], isLoading } = useQuery({
    queryKey: ["recent-books", lib.id],
    queryFn: () => listRecentBooks(lib.id, 8),
  });

  if (isLoading || books.length === 0) return null;

  return (
    <Section
      icon={<Sparkles className="h-4 w-4 text-emerald-500" />}
      eyebrow="Novidades"
      titleNode={<>Chegaram recentemente</>}
    >
      <Carousel opts={{ align: "start", dragFree: true }} className="relative">
        <CarouselContent className="-ml-3">
          {books.map((b) => (
            <CarouselItem
              key={b.id}
              className="pl-3 basis-[45%] sm:basis-[33%] md:basis-[25%] lg:basis-[20%]"
            >
              <BookCard book={b} slug={lib.slug} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="-left-3 md:-left-4" />
        <CarouselNext className="-right-3 md:-right-4" />
      </Carousel>
    </Section>
  );
}

function TopReadersSection() {
  const lib = useLibrary();
  const { data: readers = [], isLoading } = useQuery({
    queryKey: ["top-readers", lib.id, "month"],
    queryFn: () => getTopReaders(lib.id, "month", 5),
  });

  if (isLoading || readers.length === 0) return null;

  return (
    <Section
      icon={<Trophy className="h-4 w-4 text-amber-500" />}
      eyebrow="Comunidade"
      titleNode={<>Leitores do mês</>}
      action={
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href={`/${lib.slug}/rankings`}>
            Ver completo <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      }
    >
      <div className="rounded-xl border bg-card overflow-hidden">
        {readers.map((r, i) => (
          <div
            key={r.user_id}
            className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0"
          >
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                i === 0
                  ? "bg-amber-100 text-amber-700"
                  : i === 1
                    ? "bg-slate-200 text-slate-700"
                    : i === 2
                      ? "bg-orange-100 text-orange-700"
                      : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium line-clamp-1">{r.name}</div>
            </div>
            <div className="text-sm text-muted-foreground">
              {r.total} {r.total === 1 ? "livro" : "livros"}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function SuggestBookCTA() {
  const lib = useLibrary();
  return (
    <section className="container py-8">
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary shrink-0">
          <Lightbulb className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-serif text-xl mb-1">Faltou um livro?</h3>
          <p className="text-sm text-muted-foreground">
            Sugira títulos que você gostaria de ver no acervo. A bibliotecária analisa cada
            sugestão e usa pra planejar novas aquisições.
          </p>
        </div>
        <Button asChild size="lg" className="gap-2 shrink-0">
          <Link href={`/${lib.slug}/conta`}>
            Sugerir livro <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

function FullCatalogSection() {
  const lib = useLibrary();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string>("__all__");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sort, setSort] = useState<SortKey>("title");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", lib.id],
    queryFn: () => listCategories(lib.id),
  });
  const { data: books = [], isLoading } = useQuery({
    queryKey: ["books", lib.id, query, categoryId, onlyAvailable, sort],
    queryFn: () =>
      searchBooks({
        libraryId: lib.id,
        query: query || undefined,
        categoryId: categoryId === "__all__" ? undefined : categoryId,
        onlyAvailable,
        sort,
      }),
  });

  return (
    <section id="catalogo" className="container py-10 border-t scroll-mt-20">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-1">
            Acervo completo
          </div>
          <h2 className="font-serif text-2xl md:text-3xl">Todos os livros</h2>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto] mb-6 items-end">
        <div>
          <Label htmlFor="search">Buscar por título ou autor</Label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Ex.: Machado de Assis, Dom Casmurro…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="min-w-[200px]">
          <Label>Categoria</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[180px]">
          <Label>Ordenar por</Label>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Título A–Z</SelectItem>
              <SelectItem value="newest">Mais recentes</SelectItem>
              <SelectItem value="rating">Melhor avaliados</SelectItem>
              <SelectItem value="popular">Mais avaliados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 pb-1">
          <Switch
            id="only-available"
            checked={onlyAvailable}
            onCheckedChange={setOnlyAvailable}
          />
          <Label htmlFor="only-available" className="cursor-pointer">
            Só disponíveis
          </Label>
        </div>
      </div>

      <div className="text-sm text-muted-foreground mb-4">
        {isLoading
          ? "Carregando…"
          : `${books.length} ${books.length === 1 ? "livro encontrado" : "livros encontrados"}`}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
        {books.map((b) => (
          <BookCard key={b.id} book={b} slug={lib.slug} />
        ))}
      </div>

      {!isLoading && books.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          Nenhum livro encontrado com esses filtros.
        </div>
      )}
    </section>
  );
}

function Section({
  icon,
  eyebrow,
  titleNode,
  action,
  children,
}: {
  icon?: React.ReactNode;
  eyebrow?: string;
  titleNode: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="container py-10">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          {eyebrow && (
            <div className="flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-muted-foreground mb-1">
              {icon}
              {eyebrow}
            </div>
          )}
          <h2 className="font-serif text-2xl md:text-3xl">{titleNode}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function BookCard({ book, slug }: { book: BookWithCounts; slug: string }) {
  return (
    <Link
      href={`/${slug}/livros/${book.id}`}
      className="group rounded-lg border bg-card overflow-hidden hover:border-primary hover:shadow-md transition flex flex-col"
    >
      <div className="aspect-[2/3] bg-muted flex items-center justify-center overflow-hidden">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <BookOpen className="h-10 w-10 text-muted-foreground/40" />
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <div className="font-serif text-base leading-snug line-clamp-2 mb-1">{book.title}</div>
        <div className="text-xs text-muted-foreground line-clamp-1 mb-2">{book.author}</div>
        <div className="mt-auto flex items-center gap-2 text-xs">
          <Badge variant={book.available_copies > 0 ? "default" : "secondary"}>
            {book.available_copies > 0 ? `${book.available_copies} disponível` : "Indisponível"}
          </Badge>
          {book.avg_rating !== null && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Star className="h-3 w-3 fill-current text-amber-500" />
              {book.avg_rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
