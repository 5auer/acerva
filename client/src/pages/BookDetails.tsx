import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { PageShell } from "@/components/PageShell";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  ArrowLeft,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  Hash,
  Tag,
  XCircle,
} from "lucide-react";
import { Link, useRoute } from "wouter";

export default function BookDetails() {
  const [, params] = useRoute("/livros/:id");
  const id = params ? Number(params.id) : NaN;
  const bookQuery = trpc.catalog.getBook.useQuery(
    { id },
    { enabled: Number.isFinite(id) && id > 0 },
  );
  const { user } = useAuth();

  return (
    <PageShell>
      <div className="container py-8 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao catálogo
          </Button>
        </Link>

        {bookQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner />
          </div>
        ) : bookQuery.isError || !bookQuery.data ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <p className="text-foreground font-medium">
                Livro não encontrado.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Volte ao catálogo para escolher outra obra.
              </p>
            </CardContent>
          </Card>
        ) : (
          (() => {
            const b = bookQuery.data;
            const available = b.availableCopies > 0;
            return (
              <article>
                <div className="grid md:grid-cols-[180px_1fr] gap-6 mb-6 items-start">
                  {/* Capa 4:5 */}
                  <div
                    className="w-full bg-muted rounded-xl overflow-hidden border shadow-sm"
                    style={{ aspectRatio: "4 / 5", maxWidth: 220 }}
                  >
                    {b.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={b.coverUrl}
                        alt={b.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary/50">
                        <BookOpen className="h-12 w-12" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    {b.category ? (
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">
                        {b.category.name}
                      </p>
                    ) : null}
                    <h1
                      className="font-serif text-3xl md:text-4xl text-foreground leading-tight"
                      style={{ fontWeight: 600 }}
                    >
                      {b.title}
                    </h1>
                    <p className="text-lg text-muted-foreground mt-1">
                      por {b.author}
                    </p>
                    <div className="mt-4">
                      {available ? (
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/15 border-0 text-sm py-1.5 px-3">
                          <CheckCircle2 className="h-4 w-4 mr-1.5" />
                          {b.availableCopies} de {b.totalCopies}{" "}
                          exemplar{b.availableCopies > 1 ? "es" : ""}{" "}
                          disponível{b.availableCopies > 1 ? "is" : ""}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-destructive/40 text-destructive bg-destructive/5 text-sm py-1.5 px-3"
                        >
                          <XCircle className="h-4 w-4 mr-1.5" />
                          Todos os exemplares emprestados no momento
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="acerva-divider mb-6" />

                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4 flex items-start gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">
                          Editora
                        </p>
                        <p className="font-medium">
                          {b.publisher ?? "—"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">
                          Ano
                        </p>
                        <p className="font-medium">
                          {b.publicationYear ?? "—"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 flex items-start gap-3">
                      <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">
                          ISBN
                        </p>
                        <p className="font-medium">{b.isbn ?? "—"}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {b.description ? (
                  <Card className="mb-6">
                    <CardContent className="p-6">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-2">
                        <Tag className="h-3.5 w-3.5" />
                        Sobre a obra
                      </p>
                      <p className="text-foreground/90 leading-relaxed whitespace-pre-line">
                        {b.description}
                      </p>
                    </CardContent>
                  </Card>
                ) : null}

                {/* CTA */}
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <p
                        className="font-serif text-lg text-foreground"
                        style={{ fontWeight: 600 }}
                      >
                        Quer levar este livro para casa?
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Compareça à biblioteca com seu CPF. A bibliotecária
                        registra o empréstimo no sistema. Prazo de devolução:
                        15 dias.
                      </p>
                    </div>
                    {user ? (
                      <Link href="/minha-conta">
                        <Button size="lg">Minha conta</Button>
                      </Link>
                    ) : (
                      <Button
                        size="lg"
                        onClick={() => {
                          window.location.href = getLoginUrl();
                        }}
                      >
                        Fazer cadastro
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </article>
            );
          })()
        )}
      </div>
    </PageShell>
  );
}
