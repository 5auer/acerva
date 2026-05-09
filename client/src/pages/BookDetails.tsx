import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/contexts/AuthContext";
import { useLibrary } from "@/contexts/LibraryContext";
import { getBook, recordView } from "@/lib/api/books";
import { getMyMembership } from "@/lib/api/auth";
import { createReservation } from "@/lib/api/reservations";
import { listReviewsForBook, getMyReview, upsertReview } from "@/lib/api/reviews";
import {
  createNotifyRequest,
  getMyNotifyRequest,
  cancelNotifyRequest,
} from "@/lib/api/community";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BellPlus,
  BellRing,
  BookOpen,
  Bookmark,
  Loader2,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useRoute } from "wouter";

export default function BookDetails() {
  const lib = useLibrary();
  const { user } = useAuth();
  const [, params] = useRoute<{ slug: string; id: string }>("/:slug/livros/:id");
  const bookId = params?.id;
  const qc = useQueryClient();

  const { data: book, isLoading } = useQuery({
    queryKey: ["book", bookId],
    queryFn: () => (bookId ? getBook(bookId) : Promise.resolve(null)),
    enabled: !!bookId,
  });

  const { data: membership } = useQuery({
    queryKey: ["membership", lib.id, user?.id],
    queryFn: () => (user ? getMyMembership(lib.id, user.id) : Promise.resolve(null)),
    enabled: !!user,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", bookId],
    queryFn: () => (bookId ? listReviewsForBook(bookId) : Promise.resolve([])),
    enabled: !!bookId,
  });

  const { data: myReview } = useQuery({
    queryKey: ["my-review", bookId, user?.id],
    queryFn: () =>
      bookId && user ? getMyReview(bookId, user.id) : Promise.resolve(null),
    enabled: !!bookId && !!user,
  });

  const { data: notifyReq } = useQuery({
    queryKey: ["notify-req", bookId, user?.id],
    queryFn: () =>
      bookId && user ? getMyNotifyRequest(bookId, user.id) : Promise.resolve(null),
    enabled: !!bookId && !!user,
  });

  useEffect(() => {
    if (bookId) recordView(bookId, lib.id).catch(() => {});
  }, [bookId, lib.id]);

  const reserveM = useMutation({
    mutationFn: () => createReservation(bookId!, lib.id),
    onSuccess: () => {
      toast.success("Reserva criada — você tem 24h para retirar na biblioteca.");
      qc.invalidateQueries({ queryKey: ["book", bookId] });
      qc.invalidateQueries({ queryKey: ["my-reservations"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao reservar"),
  });

  const notifyM = useMutation({
    mutationFn: () => createNotifyRequest(bookId!, lib.id),
    onSuccess: () => {
      toast.success("Vamos te avisar quando o livro estiver disponível.");
      qc.invalidateQueries({ queryKey: ["notify-req", bookId, user?.id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao registrar"),
  });

  const cancelNotifyM = useMutation({
    mutationFn: (id: string) => cancelNotifyRequest(id),
    onSuccess: () => {
      toast.success("Aviso cancelado");
      qc.invalidateQueries({ queryKey: ["notify-req", bookId, user?.id] });
    },
  });

  if (isLoading)
    return (
      <PageShell>
        <div className="container py-20 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );

  if (!book)
    return (
      <PageShell>
        <div className="container py-20 text-center text-muted-foreground">
          Livro não encontrado.
        </div>
      </PageShell>
    );

  const verified = membership?.verification_status === "verified";
  const blocked = membership?.is_blocked ?? false;
  const canReserve = !!user && verified && !blocked && book.available_copies > 0;
  const canNotify = !!user && verified && !blocked && book.available_copies === 0 && !notifyReq;

  return (
    <PageShell>
      <section className="container py-6 md:py-10 max-w-5xl">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link href={`/${lib.slug}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar ao catálogo
          </Link>
        </Button>

        <div className="grid md:grid-cols-[280px_1fr] gap-8">
          <div>
            <div className="aspect-[2/3] rounded-lg overflow-hidden bg-muted shadow-md">
              {book.cover_url ? (
                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <BookOpen className="h-12 w-12 text-muted-foreground/40" />
                </div>
              )}
            </div>
          </div>

          <div>
            {book.category && (
              <Badge variant="outline" className="mb-2">
                {book.category.name}
              </Badge>
            )}
            <h1 className="font-serif text-3xl md:text-4xl mb-1">{book.title}</h1>
            <p className="text-lg text-muted-foreground mb-4">{book.author}</p>

            <div className="flex flex-wrap items-center gap-3 mb-6">
              <Badge variant={book.available_copies > 0 ? "default" : "secondary"}>
                {book.available_copies > 0
                  ? `${book.available_copies} de ${book.total_copies} disponível`
                  : "Indisponível"}
              </Badge>
              {book.avg_rating !== null && (
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 fill-current text-amber-500" />
                  <span className="font-medium">{book.avg_rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({book.review_count})</span>
                </div>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-3 mb-6 text-sm">
              {book.publisher && <Field label="Editora" value={book.publisher} />}
              {book.publication_year && (
                <Field label="Ano" value={book.publication_year.toString()} />
              )}
              {book.isbn && <Field label="ISBN" value={book.isbn} />}
              {book.shelf_location && (
                <Field label="Localização" value={book.shelf_location} />
              )}
            </dl>

            {book.description && (
              <p className="text-foreground/85 leading-relaxed mb-8">{book.description}</p>
            )}

            <div className="flex flex-wrap gap-3">
              {!user ? (
                <Button asChild>
                  <Link
                    href={`/auth?next=${encodeURIComponent(`/${lib.slug}/livros/${book.id}`)}`}
                  >
                    Entre para reservar
                  </Link>
                </Button>
              ) : !verified ? (
                <Button asChild variant="outline">
                  <Link href={`/${lib.slug}/conta`}>
                    Cadastro pendente — completar verificação
                  </Link>
                </Button>
              ) : blocked ? (
                <Button disabled variant="outline">
                  Conta bloqueada — procure a biblioteca
                </Button>
              ) : canReserve ? (
                <Button onClick={() => reserveM.mutate()} disabled={reserveM.isPending} className="gap-2">
                  {reserveM.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Bookmark className="h-4 w-4" />
                  Reservar (24h para retirar)
                </Button>
              ) : notifyReq ? (
                <Button
                  variant="outline"
                  onClick={() => cancelNotifyM.mutate(notifyReq.id)}
                  disabled={cancelNotifyM.isPending}
                  className="gap-2"
                >
                  <BellRing className="h-4 w-4" />
                  Avisar quando disponível (cancelar)
                </Button>
              ) : canNotify ? (
                <Button
                  variant="outline"
                  onClick={() => notifyM.mutate()}
                  disabled={notifyM.isPending}
                  className="gap-2"
                >
                  {notifyM.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <BellPlus className="h-4 w-4" />
                  Avise-me quando disponível
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-12 border-t pt-8">
          <h2 className="font-serif text-2xl mb-6">Avaliações dos leitores</h2>

          {user && verified && (
            <ReviewForm
              bookId={book.id}
              libraryId={lib.id}
              existing={myReview}
              onSaved={() => {
                qc.invalidateQueries({ queryKey: ["reviews", book.id] });
                qc.invalidateQueries({ queryKey: ["my-review", book.id, user.id] });
                qc.invalidateQueries({ queryKey: ["book", book.id] });
              }}
            />
          )}

          <div className="space-y-4 mt-6">
            {reviews.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Ainda não há avaliações. Seja o primeiro a opinar.
              </p>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{r.reader_name}</span>
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < r.rating ? "fill-amber-500 text-amber-500" : "text-muted"
                          }`}
                        />
                      ))}
                    </span>
                  </div>
                  {r.comment && <p className="text-sm text-foreground/85">{r.comment}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function ReviewForm({
  bookId,
  libraryId,
  existing,
  onSaved,
}: {
  bookId: string;
  libraryId: string;
  existing: any;
  onSaved: () => void;
}) {
  const [rating, setRating] = useState<number>(existing?.rating ?? 0);
  const [comment, setComment] = useState<string>(existing?.comment ?? "");
  const [busy, setBusy] = useState(false);

  return (
    <div className="rounded-lg border bg-card p-4">
      <Label className="mb-2 block">Sua avaliação</Label>
      <div className="flex items-center gap-1 mb-3">
        {Array.from({ length: 5 }, (_, i) => {
          const n = i + 1;
          return (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className="hover:scale-110 transition-transform"
              aria-label={`${n} estrelas`}
            >
              <Star
                className={`h-6 w-6 ${
                  n <= rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/40"
                }`}
              />
            </button>
          );
        })}
      </div>
      <Textarea
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Comentário (opcional)"
      />
      <div className="mt-3 flex justify-end">
        <Button
          disabled={rating === 0 || busy}
          onClick={async () => {
            setBusy(true);
            try {
              await upsertReview({ bookId, libraryId, rating, comment: comment.trim() || null });
              toast.success(existing ? "Avaliação atualizada" : "Avaliação enviada");
              onSaved();
            } catch (e: any) {
              toast.error(e.message ?? "Falha ao salvar");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {existing ? "Atualizar" : "Publicar avaliação"}
        </Button>
      </div>
    </div>
  );
}
