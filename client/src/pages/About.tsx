import { PageShell } from "@/components/PageShell";
import { useLibrary } from "@/contexts/LibraryContext";
import { useQuery } from "@tanstack/react-query";
import { getPublicStats } from "@/lib/api/rankings";
import { BookOpen, Users, BookMarked, Library, Tags } from "lucide-react";

export default function About() {
  const lib = useLibrary();
  const { data: stats } = useQuery({
    queryKey: ["public-stats", lib.id],
    queryFn: () => getPublicStats(lib.id),
  });

  return (
    <PageShell>
      <section className="container py-12 md:py-16 max-w-4xl">
        <h1 className="font-serif text-4xl md:text-5xl mb-3">{lib.name}</h1>
        {lib.city && (
          <p className="text-lg text-muted-foreground mb-8">
            {lib.city}, {lib.state}
          </p>
        )}

        {lib.description && (
          <p className="text-lg leading-relaxed text-foreground/85 mb-12">{lib.description}</p>
        )}

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
            <Stat icon={BookOpen} label="Obras" value={stats.total_books} />
            <Stat icon={BookMarked} label="Exemplares" value={stats.total_copies} />
            <Stat icon={Users} label="Leitores" value={stats.total_readers} />
            <Stat icon={Library} label="Empréstimos" value={stats.total_loans} />
            <Stat icon={Tags} label="Categorias" value={stats.total_categories} />
          </div>
        )}

        <div className="prose prose-stone max-w-none">
          <h2 className="font-serif text-2xl mb-3">Como funciona</h2>
          <ol className="space-y-2 text-foreground/80">
            <li>Crie sua conta e envie um documento (CNH ou RG) para verificação.</li>
            <li>A bibliotecária aprova seu cadastro — você recebe confirmação por e-mail.</li>
            <li>Reserve livros pelo app e tem 24 horas para retirar na biblioteca.</li>
            <li>Empréstimo de 15 dias, com 1 renovação possível pelo app.</li>
            <li>Avalie os livros que leu e veja o ranking dos mais lidos.</li>
          </ol>
        </div>
      </section>
    </PageShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-4 text-center">
      <Icon className="h-5 w-5 mx-auto mb-2 text-primary" />
      <div className="text-2xl font-serif" style={{ fontWeight: 600 }}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}
