import { useAuth } from "@/_core/hooks/useAuth";
import { PageShell } from "@/components/PageShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CoverPicker, type CoverPickerValue } from "@/components/CoverPicker";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FilePlus2,
  HourglassIcon,
  Image as ImageIcon,
  Library,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShieldX,
  Tag,
  Undo2,
  UserCheck,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

function formatDate(d?: Date | string | null) {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AdminPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <PageShell>
        <div className="container py-20 flex items-center justify-center">
          <Spinner />
        </div>
      </PageShell>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <PageShell>
        <div className="container py-16 max-w-lg">
          <Card>
            <CardContent className="py-12 text-center">
              <ShieldX className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h2 className="font-serif text-2xl mb-1">Acesso restrito</h2>
              <p className="text-muted-foreground">
                Esta área é exclusiva da bibliotecária responsável.
              </p>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="container py-8">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-1">
            Painel da bibliotecária
          </p>
          <h1
            className="font-serif text-3xl md:text-4xl"
            style={{ fontWeight: 600 }}
          >
            Gestão da Biblioteca Cruz e Sousa
          </h1>
        </header>

        <StatsRow />

        <Tabs defaultValue="loans" className="mt-2">
          <TabsList className="grid grid-cols-3 md:grid-cols-5 w-full md:w-auto">
            <TabsTrigger value="loans">
              <ClipboardList className="h-4 w-4 mr-2" />
              Empréstimos
            </TabsTrigger>
            <TabsTrigger value="verifications">
              <UserCheck className="h-4 w-4 mr-2" />
              Cadastros
            </TabsTrigger>
            <TabsTrigger value="books">
              <Library className="h-4 w-4 mr-2" />
              Acervo
            </TabsTrigger>
            <TabsTrigger value="categories">
              <Tag className="h-4 w-4 mr-2" />
              Categorias
            </TabsTrigger>
            <TabsTrigger value="new-loan">
              <FilePlus2 className="h-4 w-4 mr-2" />
              Novo empréstimo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="loans" className="mt-4">
            <ActiveLoansSection />
          </TabsContent>
          <TabsContent value="verifications" className="mt-4">
            <VerificationsSection />
          </TabsContent>
          <TabsContent value="books" className="mt-4">
            <BooksSection />
          </TabsContent>
          <TabsContent value="categories" className="mt-4">
            <CategoriesSection />
          </TabsContent>
          <TabsContent value="new-loan" className="mt-4">
            <NewLoanSection />
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: number | string;
  tone?: "default" | "warning" | "primary";
}) {
  const toneClasses =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "bg-muted text-muted-foreground";
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div
          className={`h-11 w-11 rounded-lg flex items-center justify-center ${toneClasses}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-serif" style={{ fontWeight: 600 }}>
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatsRow() {
  const statsQuery = trpc.admin.stats.useQuery();
  const s = statsQuery.data;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
      <StatCard
        icon={BookOpen}
        label="Obras no acervo"
        value={s?.totalBooks ?? "—"}
        tone="primary"
      />
      <StatCard
        icon={Library}
        label="Exemplares"
        value={s?.totalCopies ?? "—"}
      />
      <StatCard
        icon={ClipboardList}
        label="Empréstimos ativos"
        value={s?.activeLoans ?? "—"}
        tone="primary"
      />
      <StatCard
        icon={HourglassIcon}
        label="Cadastros para revisar"
        value={s?.pendingVerifications ?? "—"}
        tone="warning"
      />
      <StatCard
        icon={Users}
        label="Leitores verificados"
        value={s?.verifiedReaders ?? "—"}
      />
    </div>
  );
}

// ===================== ACTIVE LOANS =====================

function ActiveLoansSection() {
  const loansQuery = trpc.admin.activeLoans.useQuery();
  const utils = trpc.useUtils();
  const returnMutation = trpc.admin.returnLoan.useMutation({
    onSuccess: (res) => {
      if (res.daysLate > 0) {
        toast.warning(
          `Devolução com ${res.daysLate} dia(s) de atraso. Leitor foi bloqueado.`,
        );
      } else {
        toast.success("Devolução registrada com sucesso.");
      }
      utils.admin.activeLoans.invalidate();
      utils.admin.stats.invalidate();
      utils.catalog.search.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const unblockMutation = trpc.admin.unblockUser.useMutation({
    onSuccess: () => {
      toast.success("Leitor desbloqueado.");
      utils.admin.activeLoans.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (loansQuery.isLoading)
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );

  const data = loansQuery.data ?? [];
  if (data.length === 0)
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-muted-foreground">
          Nenhum empréstimo ativo no momento.
        </CardContent>
      </Card>
    );

  const now = new Date();

  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Leitor</th>
              <th className="px-4 py-3 font-medium">Livro</th>
              <th className="px-4 py-3 font-medium">Exemplar</th>
              <th className="px-4 py-3 font-medium">Devolução</th>
              <th className="px-4 py-3 font-medium">Renov.</th>
              <th className="px-4 py-3 text-right font-medium">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((row) => {
              const due = new Date(row.loan.dueDate);
              const isLate = due.getTime() < now.getTime();
              return (
                <tr key={row.loan.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.user.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.profile?.cpf ?? row.user.email ?? ""}
                    </div>
                    {row.profile?.isBlocked ? (
                      <Badge variant="outline" className="mt-1 border-destructive/40 text-destructive bg-destructive/5">
                        Bloqueado
                      </Badge>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.book.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.book.author}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {row.copy.copyCode}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{formatDate(due)}</span>
                      {isLate ? (
                        <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/5">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Atrasado
                        </Badge>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {row.loan.renewalCount}/2
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {row.profile?.isBlocked ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            unblockMutation.mutate({ userId: row.user.id })
                          }
                        >
                          <RotateCcw className="h-4 w-4 mr-1.5" />
                          Desbloquear
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        onClick={() =>
                          returnMutation.mutate({ loanId: row.loan.id })
                        }
                        disabled={returnMutation.isPending}
                      >
                        <Undo2 className="h-4 w-4 mr-1.5" />
                        Registrar devolução
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ===================== VERIFICATIONS =====================

function VerificationsSection() {
  const pendingQuery = trpc.admin.pendingVerifications.useQuery();
  const utils = trpc.useUtils();

  const approveMutation = trpc.admin.approveVerification.useMutation({
    onSuccess: () => {
      toast.success("Cadastro aprovado.");
      utils.admin.pendingVerifications.invalidate();
      utils.admin.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const rejectMutation = trpc.admin.rejectVerification.useMutation({
    onSuccess: () => {
      toast.success("Cadastro recusado.");
      utils.admin.pendingVerifications.invalidate();
      utils.admin.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  if (pendingQuery.isLoading)
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );

  const pending = pendingQuery.data ?? [];

  if (pending.length === 0)
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-muted-foreground">
          Nenhum cadastro aguardando revisão.
        </CardContent>
      </Card>
    );

  return (
    <div className="grid gap-4">
      {pending.map((p) => (
        <Card key={p.profile.userId}>
          <CardContent className="p-5 grid md:grid-cols-3 gap-5">
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <h3
                  className="font-serif text-lg"
                  style={{ fontWeight: 600 }}
                >
                  {p.user.name ?? "Sem nome"}
                </h3>
                <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-0">
                  <HourglassIcon className="h-3 w-3 mr-1" />
                  Aguardando análise
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {p.user.email ?? ""}
              </p>
              <div className="grid sm:grid-cols-2 gap-3 mt-2 text-sm">
                <Field label="CPF" value={p.profile.cpf} />
                <Field label="Telefone" value={p.profile.phone} />
                <div className="sm:col-span-2">
                  <Field label="Endereço" value={p.profile.address} />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Documentos
              </p>
              <div className="grid gap-2">
                {p.documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 hover:bg-accent text-sm"
                  >
                    <span>
                      {doc.docType === "identity"
                        ? "Documento com foto"
                        : "Comprovante de residência"}
                    </span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                ))}
                {p.documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum documento enviado.
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={() =>
                    approveMutation.mutate({ userId: p.profile.userId })
                  }
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Aprovar cadastro
                </Button>
                <Dialog
                  open={rejectingId === p.profile.userId}
                  onOpenChange={(o) => {
                    if (!o) {
                      setRejectingId(null);
                      setRejectReason("");
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => setRejectingId(p.profile.userId)}
                    >
                      <ShieldX className="h-4 w-4 mr-2" />
                      Recusar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Recusar cadastro</DialogTitle>
                      <DialogDescription>
                        Informe brevemente o motivo. O leitor poderá corrigir e
                        reenviar.
                      </DialogDescription>
                    </DialogHeader>
                    <Textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Ex.: Comprovante ilegível"
                    />
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancelar</Button>
                      </DialogClose>
                      <Button
                        variant="destructive"
                        disabled={rejectMutation.isPending || rejectReason.length < 3}
                        onClick={() =>
                          rejectMutation.mutate(
                            {
                              userId: p.profile.userId,
                              reason: rejectReason,
                            },
                            {
                              onSuccess: () => {
                                setRejectingId(null);
                                setRejectReason("");
                              },
                            },
                          )
                        }
                      >
                        Confirmar recusa
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="font-medium">{value || "—"}</p>
    </div>
  );
}

// ===================== BOOKS =====================

function BooksSection() {
  const booksQuery = trpc.admin.listBooks.useQuery();
  const categoriesQuery = trpc.catalog.listCategories.useQuery();
  const utils = trpc.useUtils();

  const createBookMutation = trpc.admin.createBook.useMutation({
    onSuccess: () => {
      toast.success("Livro cadastrado com sucesso.");
      utils.admin.listBooks.invalidate();
      utils.admin.stats.invalidate();
      utils.catalog.search.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const addCopyMutation = trpc.admin.addCopy.useMutation({
    onSuccess: () => {
      toast.success("Exemplar adicionado.");
      utils.admin.listBooks.invalidate();
      utils.admin.stats.invalidate();
      utils.catalog.search.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const setCoverMutation = trpc.admin.setBookCover.useMutation();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [publisher, setPublisher] = useState("");
  const [year, setYear] = useState<string>("");
  const [isbn, setIsbn] = useState("");
  const [initialCopies, setInitialCopies] = useState("1");
  const [coverDraft, setCoverDraft] = useState<CoverPickerValue | null>(null);

  const reset = () => {
    setTitle("");
    setAuthor("");
    setCategoryId("");
    setDescription("");
    setPublisher("");
    setYear("");
    setIsbn("");
    setInitialCopies("1");
    setCoverDraft(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      toast.error("Escolha uma categoria.");
      return;
    }
    createBookMutation.mutate(
      {
        title,
        author,
        categoryId: Number(categoryId),
        description: description || undefined,
        publisher: publisher || undefined,
        publicationYear: year ? Number(year) : undefined,
        isbn: isbn || undefined,
        initialCopies: Math.max(1, Math.min(20, Number(initialCopies) || 1)),
      },
      {
        onSuccess: async (res) => {
          // Se houver capa em rascunho, faz upload em seguida
          if (coverDraft && res?.bookId) {
            try {
              if (coverDraft.mode === "file" && coverDraft.fileBase64) {
                await setCoverMutation.mutateAsync({
                  bookId: res.bookId,
                  fileBase64: coverDraft.fileBase64,
                });
              } else if (coverDraft.mode === "url" && coverDraft.externalUrl) {
                await setCoverMutation.mutateAsync({
                  bookId: res.bookId,
                  externalUrl: coverDraft.externalUrl,
                });
              }
              utils.admin.listBooks.invalidate();
              utils.catalog.search.invalidate();
            } catch (err: any) {
              toast.error(
                err?.message ?? "Livro salvo, mas a capa falhou. Tente novamente em ‘Capa’.",
              );
            }
          }
          setOpen(false);
          reset();
        },
      },
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-serif text-xl" style={{ fontWeight: 600 }}>
          Acervo
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <FilePlus2 className="h-4 w-4 mr-2" />
              Cadastrar livro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Cadastrar novo livro</DialogTitle>
              <DialogDescription>
                Preencha os dados da obra e quantos exemplares físicos você tem
                hoje na biblioteca.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="grid gap-3">
              <div className="grid gap-1">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="author">Autor(a)</Label>
                <Input
                  id="author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  required
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <div className="flex items-center justify-between">
                    <Label>Categoria</Label>
                    <InlineCreateCategory
                      onCreated={(newId) => setCategoryId(String(newId))}
                    />
                  </div>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriesQuery.data?.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="copies">Exemplares iniciais</Label>
                  <Input
                    id="copies"
                    type="number"
                    min={1}
                    max={20}
                    value={initialCopies}
                    onChange={(e) => setInitialCopies(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="grid gap-1 sm:col-span-2">
                  <Label htmlFor="publisher">Editora</Label>
                  <Input
                    id="publisher"
                    value={publisher}
                    onChange={(e) => setPublisher(e.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="year">Ano</Label>
                  <Input
                    id="year"
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-1">
                <Label htmlFor="isbn">ISBN (opcional)</Label>
                <Input
                  id="isbn"
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="desc">Sinopse (opcional)</Label>
                <Textarea
                  id="desc"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label>Capa do livro (opcional)</Label>
                <CoverPicker
                  initialUrl={null}
                  onChange={(v) => setCoverDraft(v)}
                />
                <p className="text-xs text-muted-foreground">
                  Você pode adicionar a capa agora ou depois pelo botão
                  “Capa” na lista do acervo.
                </p>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" type="button">
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={createBookMutation.isPending}>
                  {createBookMutation.isPending ? "Salvando…" : "Salvar livro"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {booksQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : !booksQuery.data || booksQuery.data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhum livro cadastrado ainda.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium">Título</th>
                  <th className="px-4 py-3 font-medium">Autor</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Disponibilidade</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {booksQuery.data.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 bg-muted rounded overflow-hidden border flex-shrink-0"
                          style={{ aspectRatio: "4 / 5" }}
                        >
                          {b.coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={b.coverUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <BookOpen className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </div>
                        <span>{b.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {b.author}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {b.category?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={
                          b.availableCopies > 0
                            ? "border-primary/30 text-primary bg-primary/5"
                            : "border-destructive/40 text-destructive bg-destructive/5"
                        }
                      >
                        {b.availableCopies}/{b.totalCopies} disponíveis
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <EditCoverButton
                          bookId={b.id}
                          currentCoverUrl={b.coverUrl ?? null}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            addCopyMutation.mutate({ bookId: b.id })
                          }
                          disabled={addCopyMutation.isPending}
                        >
                          + Exemplar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ===================== NEW LOAN =====================

function NewLoanSection() {
  const utils = trpc.useUtils();
  const [cpf, setCpf] = useState("");
  const [foundUserId, setFoundUserId] = useState<number | null>(null);
  const [foundProfile, setFoundProfile] = useState<{
    name: string | null;
    cpf: string | null;
    isBlocked: boolean;
    verificationStatus: string;
  } | null>(null);

  const utilsTrpc = trpc.useUtils();
  const [searching, setSearching] = useState(false);
  const handleFind = async () => {
    setSearching(true);
    try {
      const data = await utilsTrpc.admin.findUserByCpf.fetch({ cpf });
      if (!data) {
        toast.error("Nenhum leitor encontrado com esse CPF.");
        setFoundUserId(null);
        setFoundProfile(null);
        return;
      }
      setFoundUserId(data.user.id);
      setFoundProfile({
        name: data.user.name ?? null,
        cpf: data.profile.cpf ?? null,
        isBlocked: data.profile.isBlocked,
        verificationStatus: data.profile.verificationStatus,
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao buscar leitor");
    } finally {
      setSearching(false);
    }
  };

  const booksQuery = trpc.admin.listBooks.useQuery();
  const [bookId, setBookId] = useState<string>("");

  const createLoanMutation = trpc.admin.createLoan.useMutation({
    onSuccess: (res) => {
      toast.success(
        `Empréstimo registrado. Devolução: ${formatDate(res.dueDate)}`,
      );
      utils.admin.activeLoans.invalidate();
      utils.admin.stats.invalidate();
      utils.admin.listBooks.invalidate();
      utils.catalog.search.invalidate();
      setBookId("");
    },
    onError: (e) => toast.error(e.message),
  });

  const availableBooks = useMemo(
    () => (booksQuery.data ?? []).filter((b) => b.availableCopies > 0),
    [booksQuery.data],
  );

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">1. Identificar leitor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-1">
            <Label htmlFor="cpf-find">CPF do leitor</Label>
            <Input
              id="cpf-find"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            onClick={handleFind}
            disabled={searching || cpf.length < 11}
          >
            {searching ? "Buscando…" : "Buscar leitor"}
          </Button>

          {foundProfile ? (
            <Alert
              className={
                foundProfile.isBlocked
                  ? "border-destructive/40 text-destructive bg-destructive/5"
                  : foundProfile.verificationStatus === "verified"
                    ? "border-primary/30 text-primary bg-primary/5"
                    : "border-amber-500/30 bg-amber-500/5"
              }
            >
              {foundProfile.isBlocked ? (
                <ShieldX className="h-4 w-4" />
              ) : foundProfile.verificationStatus === "verified" ? (
                <ShieldCheck className="h-4 w-4" />
              ) : (
                <HourglassIcon className="h-4 w-4" />
              )}
              <AlertTitle>
                {foundProfile.name ?? "Leitor"} —{" "}
                {foundProfile.verificationStatus === "verified"
                  ? "Verificado"
                  : foundProfile.verificationStatus === "submitted"
                    ? "Cadastro em análise"
                    : foundProfile.verificationStatus === "rejected"
                      ? "Cadastro recusado"
                      : "Cadastro pendente"}
              </AlertTitle>
              <AlertDescription>
                CPF: {foundProfile.cpf ?? "—"}
                {foundProfile.isBlocked
                  ? " · Conta bloqueada por atraso. Regularize antes de emprestar."
                  : ""}
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif">2. Escolher livro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-1">
            <Label>Obra</Label>
            <Select value={bookId} onValueChange={setBookId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um livro disponível" />
              </SelectTrigger>
              <SelectContent>
                {availableBooks.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.title} — {b.author} ({b.availableCopies}/{b.totalCopies})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableBooks.length === 0 && !booksQuery.isLoading ? (
              <p className="text-xs text-muted-foreground">
                Nenhum livro com exemplar disponível agora.
              </p>
            ) : null}
          </div>
          <Button
            className="w-full"
            disabled={
              !foundUserId ||
              !bookId ||
              createLoanMutation.isPending ||
              foundProfile?.isBlocked ||
              foundProfile?.verificationStatus !== "verified"
            }
            onClick={() => {
              if (!foundUserId || !bookId) return;
              createLoanMutation.mutate({
                userId: foundUserId,
                bookId: Number(bookId),
              });
            }}
          >
            {createLoanMutation.isPending
              ? "Registrando…"
              : "Registrar empréstimo (15 dias)"}
          </Button>
          <p className="text-xs text-muted-foreground">
            O sistema valida automaticamente: leitor verificado, sem bloqueio,
            até 3 livros simultâneos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


// ===================== CATEGORIES =====================

function CategoriesSection() {
  const categoriesQuery = trpc.catalog.listCategories.useQuery();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");

  const createMutation = trpc.admin.createCategory.useMutation({
    onSuccess: () => {
      toast.success("Categoria criada.");
      setName("");
      utils.catalog.listCategories.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Use pelo menos 2 caracteres.");
      return;
    }
    createMutation.mutate({ name: trimmed });
  };

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">
            Categorias do acervo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categoriesQuery.isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : !categoriesQuery.data || categoriesQuery.data.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhuma categoria cadastrada ainda.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categoriesQuery.data.map((c) => (
                <Badge
                  key={c.id}
                  variant="outline"
                  className="border-primary/30 text-primary bg-primary/5 px-3 py-1"
                >
                  <Tag className="h-3.5 w-3.5 mr-1.5" />
                  {c.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Nova categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-3">
            <div className="grid gap-1">
              <Label htmlFor="cat-name">Nome</Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Autoajuda, Biografia, Esportes…"
                maxLength={64}
              />
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Criando…" : "Criar categoria"}
            </Button>
            <p className="text-xs text-muted-foreground">
              O sistema gera automaticamente um identificador interno (slug)
              sem acentos.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== COVER EDIT BUTTON =====================

function EditCoverButton({
  bookId,
  currentCoverUrl,
}: {
  bookId: number;
  currentCoverUrl: string | null;
}) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CoverPickerValue | null>(null);
  const [shouldClear, setShouldClear] = useState(false);

  const setCoverMutation = trpc.admin.setBookCover.useMutation({
    onSuccess: () => {
      toast.success("Capa atualizada.");
      utils.admin.listBooks.invalidate();
      utils.catalog.search.invalidate();
      utils.catalog.getBook.invalidate({ id: bookId });
      setOpen(false);
      setDraft(null);
      setShouldClear(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (shouldClear) {
      setCoverMutation.mutate({ bookId, clear: true });
      return;
    }
    if (!draft) {
      toast.info("Escolha uma imagem ou cole uma URL.");
      return;
    }
    if (draft.mode === "file" && draft.fileBase64) {
      setCoverMutation.mutate({ bookId, fileBase64: draft.fileBase64 });
    } else if (draft.mode === "url" && draft.externalUrl) {
      setCoverMutation.mutate({ bookId, externalUrl: draft.externalUrl });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <ImageIcon className="h-4 w-4 mr-1.5" />
          Capa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Capa do livro</DialogTitle>
          <DialogDescription>
            Envie do dispositivo, tire foto na hora (tablet/celular) ou cole a
            URL pública da imagem. Formato recomendado: 4:5 retrato.
          </DialogDescription>
        </DialogHeader>
        <CoverPicker
          initialUrl={currentCoverUrl}
          onChange={(v) => {
            setDraft(v);
            setShouldClear(false);
          }}
          allowClear
          onClear={() => {
            setDraft(null);
            setShouldClear(true);
          }}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={setCoverMutation.isPending}
          >
            {setCoverMutation.isPending ? "Salvando…" : "Salvar capa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// ===================== INLINE CREATE CATEGORY =====================

function InlineCreateCategory({
  onCreated,
}: {
  onCreated: (newId: number) => void;
}) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const createMutation = trpc.admin.createCategory.useMutation({
    onSuccess: (res) => {
      toast.success("Categoria criada.");
      utils.catalog.listCategories.invalidate();
      setName("");
      setOpen(false);
      if (res?.category?.id) onCreated(res.category.id);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-primary hover:text-primary"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Nova
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nova categoria</DialogTitle>
          <DialogDescription>
            Use um nome curto e claro. Ex.: Autoajuda, Biografia.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="quick-cat-name">Nome</Label>
          <Input
            id="quick-cat-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={64}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (name.trim().length >= 2) {
                  createMutation.mutate({ name: name.trim() });
                }
              }
            }}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={createMutation.isPending || name.trim().length < 2}
            onClick={() => createMutation.mutate({ name: name.trim() })}
          >
            {createMutation.isPending ? "Criando…" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
