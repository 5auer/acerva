import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageShell } from "@/components/PageShell";
import { useLibrary } from "@/contexts/LibraryContext";
import {
  getMostLoanedBooks,
  getTopBooks,
  getTopReaders,
  type Period,
} from "@/lib/api/rankings";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Eye, Loader2, Medal, Trophy } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function Rankings() {
  const lib = useLibrary();
  const [period, setPeriod] = useState<Period>("month");

  return (
    <PageShell>
      <section className="container py-8 md:py-12 max-w-5xl">
        <Badge variant="outline" className="mb-3 border-primary/30 text-primary bg-primary/5">
          <Trophy className="h-3.5 w-3.5 mr-1.5" />
          Comunidade
        </Badge>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl mb-1">Rankings</h1>
            <p className="text-muted-foreground">
              Os mais lidos, os mais vistos, e os leitores mais ativos.
            </p>
          </div>
          <div className="min-w-[180px]">
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">No mês</SelectItem>
                <SelectItem value="semester">Semestre</SelectItem>
                <SelectItem value="year">No ano</SelectItem>
                <SelectItem value="all">Todo período</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="readers">
          <TabsList>
            <TabsTrigger value="readers">Leitores mais ativos</TabsTrigger>
            <TabsTrigger value="loaned">Mais emprestados</TabsTrigger>
            <TabsTrigger value="viewed">Mais vistos</TabsTrigger>
          </TabsList>

          <TabsContent value="readers" className="mt-6">
            <ReadersList libraryId={lib.id} period={period} />
          </TabsContent>
          <TabsContent value="loaned" className="mt-6">
            <BooksGrid libraryId={lib.id} mode="loaned" period={period} />
          </TabsContent>
          <TabsContent value="viewed" className="mt-6">
            <BooksGrid libraryId={lib.id} mode="viewed" period={period} />
          </TabsContent>
        </Tabs>
      </section>
    </PageShell>
  );
}

function ReadersList({ libraryId, period }: { libraryId: string; period: Period }) {
  const { data: readers = [], isLoading } = useQuery({
    queryKey: ["top-readers-page", libraryId, period],
    queryFn: () => getTopReaders(libraryId, period, 25),
  });

  if (isLoading)
    return (
      <div className="text-center py-10">
        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  if (readers.length === 0)
    return (
      <div className="text-center py-12 text-muted-foreground">
        Ainda não há empréstimos no período selecionado.
      </div>
    );

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {readers.map((r, i) => (
        <div
          key={r.user_id}
          className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0"
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
              i === 0
                ? "bg-amber-100 text-amber-700"
                : i === 1
                  ? "bg-slate-200 text-slate-700"
                  : i === 2
                    ? "bg-orange-100 text-orange-700"
                    : "bg-muted text-muted-foreground"
            }`}
          >
            {i < 3 ? <Medal className="h-4 w-4" /> : i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium line-clamp-1">{r.name}</div>
            <div className="text-xs text-muted-foreground">#{i + 1}</div>
          </div>
          <div className="text-sm">
            <span className="font-semibold">{r.total}</span>{" "}
            <span className="text-muted-foreground">
              {r.total === 1 ? "livro" : "livros"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function BooksGrid({
  libraryId,
  mode,
  period,
}: {
  libraryId: string;
  mode: "loaned" | "viewed";
  period: Period;
}) {
  const lib = useLibrary();
  const { data: books = [], isLoading } = useQuery({
    queryKey: ["top-books-page", libraryId, mode, period],
    queryFn: () =>
      mode === "loaned"
        ? getMostLoanedBooks(libraryId, 25)
        : getTopBooks(libraryId, period, 25),
  });

  if (isLoading)
    return (
      <div className="text-center py-10">
        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  if (books.length === 0)
    return (
      <div className="text-center py-12 text-muted-foreground">
        Sem dados para exibir no período selecionado.
      </div>
    );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {books.map((b, i) => (
        <Link
          key={b.book_id}
          href={`/${lib.slug}/livros/${b.book_id}`}
          className="group rounded-lg border bg-card overflow-hidden hover:border-primary hover:shadow-md transition flex flex-col relative"
        >
          <div className="absolute top-2 left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 backdrop-blur text-xs font-bold border">
            {i + 1}
          </div>
          <div className="aspect-[2/3] bg-muted flex items-center justify-center overflow-hidden">
            {b.cover_url ? (
              <img
                src={b.cover_url}
                alt={b.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <BookOpen className="h-10 w-10 text-muted-foreground/40" />
            )}
          </div>
          <div className="p-3">
            <div className="font-serif text-base leading-snug line-clamp-2 mb-1">{b.title}</div>
            <div className="text-xs text-muted-foreground line-clamp-1 mb-2">{b.author}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {mode === "loaned" ? (
                <>
                  <Trophy className="h-3 w-3" />
                  {b.total} {b.total === 1 ? "empréstimo" : "empréstimos"}
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3" />
                  {b.total} {b.total === 1 ? "visualização" : "visualizações"}
                </>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
