import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/contexts/AuthContext";
import { useLibrary } from "@/contexts/LibraryContext";
import {
  createBook,
  deleteBook,
  deleteCopyHard,
  discardCopy,
  listBookCopies,
  listCategories,
  restoreCopy,
  searchBooks,
  updateBook,
  addCopy,
  type BookInput,
  type BookWithCounts,
  type Copy,
} from "@/lib/api/books";
import {
  createCategory,
  deleteCategory,
  listCategoriesWithCount,
  updateCategory,
} from "@/lib/api/categories";
import {
  findUserByCpf,
  listLibraryUsers,
  listPendingVerifications,
  reviewVerification,
  setAdminRole,
  unblockUser,
  type LibraryUser,
} from "@/lib/api/admin";
import {
  createLoanDirect,
  listActiveLoans,
  returnLoan,
} from "@/lib/api/loans";
import {
  fulfillReservation,
  listPendingReservations,
} from "@/lib/api/reservations";
import {
  listSuggestions,
  updateSuggestionStatus,
  type Suggestion,
} from "@/lib/api/community";
import { uploadCover } from "@/lib/api/storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BookOpen,
  Check,
  ExternalLink,
  FolderOpen,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Upload,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

export default function AdminPage() {
  const lib = useLibrary();
  const { user, isAdmin, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) setLocation(`/auth?next=${encodeURIComponent(`/${lib.slug}/admin`)}`);
  }, [loading, user, lib.slug, setLocation]);

  if (loading) {
    return (
      <PageShell>
        <div className="container py-20 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }
  if (!user) return null;

  if (!isAdmin) {
    return (
      <PageShell>
        <div className="container py-20 max-w-xl text-center">
          <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h1 className="font-serif text-2xl mb-2">Acesso restrito</h1>
          <p className="text-muted-foreground mb-4">
            Esta área é exclusiva para a equipe da biblioteca.
          </p>
          <Button asChild variant="outline">
            <Link href={`/${lib.slug}`}>Voltar ao catálogo</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="container py-8 md:py-12">
        <Badge variant="outline" className="mb-2 border-primary/30 text-primary bg-primary/5">
          <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
          Painel administrativo
        </Badge>
        <h1 className="font-serif text-3xl md:text-4xl mb-6">Bibliotecária</h1>

        <Tabs defaultValue="acervo">
          <TabsList>
            <TabsTrigger value="acervo">Acervo</TabsTrigger>
            <TabsTrigger value="verificacoes">Verificações</TabsTrigger>
            <TabsTrigger value="reservas">Reservas / Empréstimos</TabsTrigger>
            <TabsTrigger value="sugestoes">Sugestões</TabsTrigger>
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          </TabsList>

          <TabsContent value="acervo" className="mt-6">
            <AcervoTab />
          </TabsContent>
          <TabsContent value="verificacoes" className="mt-6">
            <VerificationsTab />
          </TabsContent>
          <TabsContent value="reservas" className="mt-6">
            <LoansTab />
          </TabsContent>
          <TabsContent value="sugestoes" className="mt-6">
            <SuggestionsTab />
          </TabsContent>
          <TabsContent value="usuarios" className="mt-6">
            <UsersTab />
          </TabsContent>
        </Tabs>
      </section>
    </PageShell>
  );
}

/* ============ Acervo ============ */
function AcervoTab() {
  const lib = useLibrary();
  const qc = useQueryClient();
  const { data: books = [], isLoading } = useQuery({
    queryKey: ["admin-books", lib.id],
    queryFn: () => searchBooks({ libraryId: lib.id, sort: "title" }),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", lib.id],
    queryFn: () => listCategories(lib.id),
  });

  const [editing, setEditing] = useState<BookWithCounts | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<BookWithCounts | null>(null);
  const [managingCategories, setManagingCategories] = useState(false);
  const [copiesFor, setCopiesFor] = useState<BookWithCounts | null>(null);
  const [filterCategoryId, setFilterCategoryId] = useState<string>("__all__");
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-books", lib.id] });

  const filteredBooks =
    filterCategoryId === "__all__"
      ? books
      : books.filter((b) => b.category_id === filterCategoryId);

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif text-2xl">Acervo</h2>
          <p className="text-muted-foreground mt-1">
            {filteredBooks.length} de {books.length}{" "}
            {books.length === 1 ? "obra" : "obras"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setManagingCategories(true)}
            className="gap-2"
          >
            <FolderOpen className="h-4 w-4" />
            Categorias
          </Button>
          <Button onClick={() => setCreating(true)} size="lg" className="gap-2">
            <Plus className="h-4 w-4" />
            Novo livro
          </Button>
        </div>
      </div>

      <div className="mb-4 flex items-end gap-3">
        <div className="min-w-[240px]">
          <Label className="text-xs">Filtrar por categoria</Label>
          <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas as categorias</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Capa</TableHead>
              <TableHead>Título / Autor</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Editora / Ano</TableHead>
              <TableHead>ISBN</TableHead>
              <TableHead className="text-center">Exemplares</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredBooks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  {books.length === 0
                    ? 'Nenhum livro. Clique em "Novo livro".'
                    : "Nenhum livro nesta categoria."}
                </TableCell>
              </TableRow>
            ) : (
              filteredBooks.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <div className="h-14 w-10 rounded overflow-hidden bg-muted flex items-center justify-center">
                      {b.cover_url ? (
                        <img src={b.cover_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{b.title}</div>
                    <div className="text-sm text-muted-foreground">{b.author}</div>
                  </TableCell>
                  <TableCell className="text-sm">{b.category?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm font-mono">
                    {b.shelf_location ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{b.publisher ?? "—"}</div>
                    <div className="text-muted-foreground">{b.publication_year ?? ""}</div>
                  </TableCell>
                  <TableCell className="text-sm font-mono">{b.isbn ?? "—"}</TableCell>
                  <TableCell className="text-center">
                    <button
                      type="button"
                      onClick={() => setCopiesFor(b)}
                      className="inline-flex"
                      title="Gerenciar exemplares"
                    >
                      <Badge
                        variant={b.available_copies > 0 ? "default" : "secondary"}
                        className="cursor-pointer hover:opacity-80"
                      >
                        {b.available_copies}/{b.total_copies}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <AddCopyButton libraryId={lib.id} bookId={b.id} onAdded={refresh} />
                      <Button variant="ghost" size="sm" onClick={() => setEditing(b)} className="gap-1">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleting(b)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <BookFormDialog
        open={creating}
        onOpenChange={setCreating}
        categories={categories}
        onSaved={refresh}
        mode="create"
      />
      <BookFormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        categories={categories}
        book={editing}
        onSaved={refresh}
        mode="edit"
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{deleting?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove o livro e todos os exemplares. Não pode ser desfeito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleting) return;
                try {
                  await deleteBook(deleting.id);
                  toast.success("Livro removido");
                  setDeleting(null);
                  refresh();
                } catch (e: any) {
                  toast.error(e.message ?? "Falha ao excluir");
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CategoriesManagerDialog
        open={managingCategories}
        onOpenChange={setManagingCategories}
      />

      <CopiesManagerDialog
        book={copiesFor}
        onOpenChange={(o) => !o && setCopiesFor(null)}
        onChange={refresh}
      />
    </>
  );
}

/* ============ Categories Manager ============ */
function CategoriesManagerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const lib = useLibrary();
  const qc = useQueryClient();
  const { data: cats = [], isLoading } = useQuery({
    queryKey: ["categories-with-count", lib.id],
    enabled: open,
    queryFn: () => listCategoriesWithCount(lib.id),
  });
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["categories-with-count", lib.id] });
    qc.invalidateQueries({ queryKey: ["categories", lib.id] });
    qc.invalidateQueries({ queryKey: ["admin-books", lib.id] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Categorias</DialogTitle>
          <DialogDescription>
            Crie, renomeie ou remova categorias do acervo desta biblioteca.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            setBusy(true);
            try {
              await createCategory(lib.id, newName.trim());
              toast.success("Categoria criada");
              setNewName("");
              refresh();
            } catch (err: any) {
              toast.error(err.message ?? "Falha ao criar");
            } finally {
              setBusy(false);
            }
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="Ex.: Quadrinhos"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button type="submit" disabled={busy || !newName.trim()} className="gap-1">
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </form>

        <div className="border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="text-center py-6">
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            </div>
          ) : cats.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              Nenhuma categoria.
            </div>
          ) : (
            cats.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 px-3 py-2 border-b last:border-b-0"
              >
                {editingId === c.id ? (
                  <>
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      autoFocus
                      className="h-8"
                    />
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          await updateCategory(c.id, editingName);
                          toast.success("Renomeado");
                          setEditingId(null);
                          refresh();
                        } catch (err: any) {
                          toast.error(err.message ?? "Falha");
                        }
                      }}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {c.book_count} {c.book_count === 1 ? "livro" : "livros"}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(c.id);
                        setEditingName(c.name);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (
                          c.book_count > 0 &&
                          !confirm(
                            `Esta categoria tem ${c.book_count} livro(s). Os livros ficarão sem categoria. Continuar?`,
                          )
                        )
                          return;
                        try {
                          await deleteCategory(c.id);
                          toast.success("Categoria removida");
                          refresh();
                        } catch (err: any) {
                          toast.error(err.message ?? "Falha ao remover");
                        }
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============ Copies Manager ============ */
function CopiesManagerDialog({
  book,
  onOpenChange,
  onChange,
}: {
  book: BookWithCounts | null;
  onOpenChange: (o: boolean) => void;
  onChange: () => void;
}) {
  const lib = useLibrary();
  const qc = useQueryClient();
  const open = !!book;
  const { data: copies = [], isLoading } = useQuery({
    queryKey: ["book-copies", book?.id],
    enabled: open && !!book,
    queryFn: () => (book ? listBookCopies(book.id) : Promise.resolve([])),
  });

  const [discardingCopy, setDiscardingCopy] = useState<Copy | null>(null);
  const [discardReason, setDiscardReason] = useState("");
  const [newCopyCode, setNewCopyCode] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["book-copies", book?.id] });
    onChange();
  };

  function statusLabel(s: string) {
    switch (s) {
      case "available":
        return "disponível";
      case "loaned":
        return "emprestado";
      case "reserved":
        return "reservado";
      case "maintenance":
        return "manutenção";
      case "discarded":
        return "descartado";
      default:
        return s;
    }
  }

  function statusVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
    if (s === "available") return "default";
    if (s === "loaned" || s === "reserved") return "secondary";
    if (s === "discarded") return "destructive";
    return "outline";
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Exemplares de "{book?.title}"</DialogTitle>
          <DialogDescription>
            Gerencie os exemplares físicos: adicione, descarte com motivo ou remova permanentemente.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!book || !newCopyCode.trim()) return;
            setBusy(true);
            try {
              await addCopy(lib.id, book.id, newCopyCode.trim());
              toast.success("Exemplar adicionado");
              setNewCopyCode("");
              refresh();
            } catch (err: any) {
              toast.error(err.message ?? "Falha");
            } finally {
              setBusy(false);
            }
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="Código de tombo (ex: 0042-A)"
            value={newCopyCode}
            onChange={(e) => setNewCopyCode(e.target.value)}
            maxLength={32}
          />
          <Button type="submit" disabled={busy || !newCopyCode.trim()} className="gap-1">
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </form>

        <div className="border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="text-center py-6">
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            </div>
          ) : copies.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              Sem exemplares.
            </div>
          ) : (
            copies.map((c) => (
              <div
                key={c.id}
                className="flex items-start gap-2 px-3 py-3 border-b last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-medium">{c.copy_code}</span>
                    <Badge variant={statusVariant(c.status)}>{statusLabel(c.status)}</Badge>
                  </div>
                  {c.discard_reason && (
                    <div className="text-xs text-muted-foreground">
                      Motivo: {c.discard_reason}
                      {c.discarded_at && (
                        <>
                          {" · "}
                          {format(new Date(c.discarded_at), "dd/MM/yyyy", { locale: ptBR })}
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  {c.status === "discarded" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      title="Restaurar"
                      onClick={async () => {
                        try {
                          await restoreCopy(c.id);
                          toast.success("Restaurado");
                          refresh();
                        } catch (err: any) {
                          toast.error(err.message ?? "Falha");
                        }
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  ) : c.status === "available" || c.status === "maintenance" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      title="Descartar com motivo"
                      onClick={() => {
                        setDiscardingCopy(c);
                        setDiscardReason("");
                      }}
                      className="gap-1 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Descartar
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>

      <AlertDialog open={!!discardingCopy} onOpenChange={(o) => !o && setDiscardingCopy(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Descartar exemplar {discardingCopy?.copy_code}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O exemplar fica marcado como descartado mas o registro permanece. Você pode restaurar
              depois se quiser. Informe o motivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div>
            <Label htmlFor="discard-reason">Motivo</Label>
            <Textarea
              id="discard-reason"
              value={discardReason}
              onChange={(e) => setDiscardReason(e.target.value)}
              placeholder="Ex.: deteriorização, perda, doação..."
              rows={3}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!discardingCopy) return;
                try {
                  await discardCopy(discardingCopy.id, discardReason.trim());
                  toast.success("Exemplar descartado");
                  setDiscardingCopy(null);
                  refresh();
                } catch (err: any) {
                  toast.error(err.message ?? "Falha ao descartar");
                }
              }}
              disabled={discardReason.trim().length < 3}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

function AddCopyButton({
  libraryId,
  bookId,
  onAdded,
}: {
  libraryId: string;
  bookId: string;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="gap-1">
        <Plus className="h-3.5 w-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo exemplar</DialogTitle>
            <DialogDescription>Informe o código de tombo do exemplar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Código</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ex: 0042-A"
              maxLength={32}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={busy || !code.trim()}
              onClick={async () => {
                setBusy(true);
                try {
                  await addCopy(libraryId, bookId, code.trim());
                  toast.success("Exemplar adicionado");
                  setCode("");
                  setOpen(false);
                  onAdded();
                } catch (e: any) {
                  toast.error(e.message ?? "Falha");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BookFormDialog({
  open,
  onOpenChange,
  categories,
  book,
  onSaved,
  mode,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  categories: { id: string; name: string }[];
  book?: BookWithCounts | null;
  onSaved: () => void;
  mode: "create" | "edit";
}) {
  const lib = useLibrary();
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm({
        title: book?.title ?? "",
        author: book?.author ?? "",
        category_id: book?.category_id ?? "",
        description: book?.description ?? "",
        publisher: book?.publisher ?? "",
        publication_year: book?.publication_year ?? "",
        isbn: book?.isbn ?? "",
        shelf_location: book?.shelf_location ?? "",
        cover_url: book?.cover_url ?? "",
      });
    }
  }, [open, book]);

  async function handleSave() {
    if (!form.title?.trim() || !form.author?.trim() || !form.category_id) {
      toast.error("Preencha título, autor e categoria");
      return;
    }
    setBusy(true);
    try {
      const payload: BookInput = {
        title: form.title.trim(),
        author: form.author.trim(),
        category_id: form.category_id || null,
        description: form.description?.trim() || null,
        publisher: form.publisher?.trim() || null,
        publication_year: form.publication_year ? Number(form.publication_year) : null,
        isbn: form.isbn?.trim() || null,
        shelf_location: form.shelf_location?.trim() || null,
        cover_url: form.cover_url || null,
      };
      if (mode === "create") {
        await createBook(lib.id, payload);
        toast.success("Livro criado");
      } else if (book) {
        await updateBook(book.id, payload);
        toast.success("Livro atualizado");
      }
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao salvar");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const id = book?.id ?? crypto.randomUUID();
      const url = await uploadCover(id, file);
      setForm((f: any) => ({ ...f, cover_url: url }));
      toast.success("Capa enviada");
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao enviar");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo livro" : "Editar livro"}</DialogTitle>
          <DialogDescription>Campos com * são obrigatórios.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="flex gap-4">
            <div className="w-32 shrink-0">
              <Label className="mb-2 block">Capa</Label>
              <div
                className="w-32 h-44 rounded border bg-muted flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary"
                onClick={() => fileRef.current?.click()}
              >
                {form.cover_url ? (
                  <img src={form.cover_url} alt="" className="w-full h-full object-cover" />
                ) : uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <div className="text-center text-xs text-muted-foreground p-2">
                    <Upload className="h-5 w-5 mx-auto mb-1" />
                    Clique para enviar
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
              />
            </div>
            <div className="flex-1 space-y-3">
              <FormField
                label="Título *"
                value={form.title}
                onChange={(v) => setForm({ ...form, title: v })}
              />
              <FormField
                label="Autor *"
                value={form.author}
                onChange={(v) => setForm({ ...form, author: v })}
              />
              <div>
                <Label>Categoria *</Label>
                <Select
                  value={form.category_id}
                  onValueChange={(v) => setForm({ ...form, category_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField
              label="Editora"
              value={form.publisher}
              onChange={(v) => setForm({ ...form, publisher: v })}
            />
            <FormField
              label="Ano"
              type="number"
              value={form.publication_year}
              onChange={(v) => setForm({ ...form, publication_year: v })}
            />
            <FormField
              label="ISBN"
              value={form.isbn}
              onChange={(v) => setForm({ ...form, isbn: v })}
            />
          </div>

          <FormField
            label="Localização (prateleira)"
            value={form.shelf_location}
            onChange={(v) => setForm({ ...form, shelf_location: v })}
          />
          <p className="text-xs text-muted-foreground -mt-2">
            Etiqueta usada pra encontrar o livro na biblioteca. Ex.: "B-12-3" (estante B, lado 12,
            prateleira 3).
          </p>

          <div>
            <Label>Descrição</Label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Sinopse do livro…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === "create" ? "Criar livro" : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/* ============ Verifications ============ */
function VerificationsTab() {
  const lib = useLibrary();
  const qc = useQueryClient();
  const { data: pending = [], isLoading } = useQuery({
    queryKey: ["pending-verifications", lib.id],
    queryFn: () => listPendingVerifications(lib.id),
  });

  const reviewM = useMutation({
    mutationFn: (input: { userId: string; approve: boolean; reason?: string }) =>
      reviewVerification({ libraryId: lib.id, ...input }),
    onSuccess: () => {
      toast.success("Atualizado");
      qc.invalidateQueries({ queryKey: ["pending-verifications", lib.id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha"),
  });

  if (isLoading)
    return (
      <div className="text-center py-8">
        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
      </div>
    );
  if (pending.length === 0)
    return (
      <div className="text-center py-12 text-muted-foreground">
        <UserCheck className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
        Nenhum cadastro aguardando verificação.
      </div>
    );

  return (
    <div className="space-y-3">
      {pending.map((m) => {
        const fullAddress = [
          m.address,
          m.address_number,
          m.address_complement,
          m.address_neighborhood,
          m.address_city ? `${m.address_city}/${m.address_state ?? ""}` : null,
          m.address_zip,
        ]
          .filter((p) => p && String(p).trim())
          .join(", ");
        return (
          <div key={m.user_id} className="rounded-xl border bg-card p-4">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <div className="font-serif text-lg">{m.profile?.name ?? "Sem nome"}</div>
                  <div className="text-sm text-muted-foreground">{m.profile?.email}</div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <Field label="CPF" value={m.profile?.cpf ?? "—"} />
                  <Field label="Telefone" value={m.profile?.phone ?? "—"} />
                  <Field label="Documento" value={(m.doc_type ?? "—").toUpperCase()} />
                  <Field label="Número" value={m.doc_number ?? "—"} />
                </div>

                {fullAddress && (
                  <div className="text-xs">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                      Endereço
                    </div>
                    <div className="font-medium">{fullAddress}</div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {m.doc_image_url && (
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <a href={m.doc_image_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Documento de identidade
                      </a>
                    </Button>
                  )}
                  {m.address_proof_url && (
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <a href={m.address_proof_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Comprovante de residência
                      </a>
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => reviewM.mutate({ userId: m.user_id, approve: true })}
                  disabled={reviewM.isPending}
                  className="gap-1"
                >
                  <Check className="h-4 w-4" />
                  Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const reason = prompt("Motivo da rejeição:");
                    if (reason)
                      reviewM.mutate({ userId: m.user_id, approve: false, reason });
                  }}
                  disabled={reviewM.isPending}
                  className="gap-1 text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                  Rejeitar
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

/* ============ Reservations / Loans ============ */
function LoansTab() {
  const lib = useLibrary();
  const qc = useQueryClient();
  const { data: reservations = [] } = useQuery({
    queryKey: ["pending-reservations", lib.id],
    queryFn: () => listPendingReservations(lib.id),
  });
  const { data: activeLoans = [] } = useQuery({
    queryKey: ["active-loans", lib.id],
    queryFn: () => listActiveLoans(lib.id),
  });

  const fulfillM = useMutation({
    mutationFn: (id: string) => fulfillReservation(id),
    onSuccess: () => {
      toast.success("Reserva convertida em empréstimo");
      qc.invalidateQueries({ queryKey: ["pending-reservations", lib.id] });
      qc.invalidateQueries({ queryKey: ["active-loans", lib.id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha"),
  });

  const returnM = useMutation({
    mutationFn: (id: string) => returnLoan(id),
    onSuccess: (daysLate) => {
      if ((daysLate ?? 0) > 0) {
        toast.warning(`Devolvido com ${daysLate} dia(s) de atraso. Leitor bloqueado.`);
      } else {
        toast.success("Devolução registrada");
      }
      qc.invalidateQueries({ queryKey: ["active-loans", lib.id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha"),
  });

  return (
    <div className="space-y-8">
      <DirectLoanForm />

      <div>
        <h2 className="font-serif text-xl mb-3">Reservas aguardando retirada</h2>
        {reservations.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhuma reserva pendente.</p>
        ) : (
          <div className="space-y-2">
            {reservations.map((r) => {
              const expired = new Date(r.expires_at) < new Date();
              return (
                <div
                  key={r.id}
                  className="rounded-lg border bg-card p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium line-clamp-1">{r.book?.title}</div>
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {r.reader_name ?? r.reader_email}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      reservado: {format(new Date(r.reserved_at), "dd/MM HH:mm", { locale: ptBR })}{" "}
                      · expira: {format(new Date(r.expires_at), "dd/MM HH:mm", { locale: ptBR })}
                      {expired && <Badge variant="destructive" className="ml-2">expirada</Badge>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => fulfillM.mutate(r.id)}
                    disabled={fulfillM.isPending || expired}
                  >
                    Confirmar retirada
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-serif text-xl mb-3">Empréstimos ativos</h2>
        {activeLoans.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum empréstimo ativo.</p>
        ) : (
          <div className="space-y-2">
            {activeLoans.map((l) => {
              const overdue = new Date(l.due_date) < new Date();
              return (
                <div
                  key={l.id}
                  className="rounded-lg border bg-card p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium line-clamp-1">{l.book?.title}</div>
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {l.reader_name ?? l.reader_email}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      vencimento: {format(new Date(l.due_date), "dd/MM/yyyy", { locale: ptBR })}
                      {overdue && <Badge variant="destructive" className="ml-2">atrasado</Badge>}
                      <span className="ml-2">renovações: {l.renewal_count}/1</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => returnM.mutate(l.id)} disabled={returnM.isPending}>
                    Registrar devolução
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DirectLoanForm() {
  const lib = useLibrary();
  const qc = useQueryClient();
  const [cpf, setCpf] = useState("");
  const [bookId, setBookId] = useState("");
  const [foundUser, setFoundUser] = useState<{ id: string; name: string | null; email: string | null } | null>(null);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bookQuery, setBookQuery] = useState("");
  const { data: bookOptions = [] } = useQuery({
    queryKey: ["admin-book-search", lib.id, bookQuery],
    queryFn: () =>
      bookQuery.length >= 2
        ? searchBooks({ libraryId: lib.id, query: bookQuery, onlyAvailable: true })
        : Promise.resolve([]),
    enabled: bookQuery.length >= 2,
  });

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <h2 className="font-serif text-xl">Empréstimo direto (na biblioteca)</h2>
      <div className="grid md:grid-cols-3 gap-3 items-end">
        <div>
          <Label>CPF do leitor</Label>
          <Input
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            placeholder="000.000.000-00"
          />
        </div>
        <div>
          <Button
            variant="outline"
            disabled={!cpf || searching}
            onClick={async () => {
              setSearching(true);
              try {
                const u = await findUserByCpf(cpf.trim());
                if (!u) toast.error("Leitor não encontrado");
                setFoundUser(u);
              } catch (e: any) {
                toast.error(e.message ?? "Falha");
              } finally {
                setSearching(false);
              }
            }}
          >
            {searching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Buscar
          </Button>
        </div>
        <div>
          {foundUser && (
            <div className="text-sm">
              <div className="font-medium">{foundUser.name}</div>
              <div className="text-muted-foreground text-xs">{foundUser.email}</div>
            </div>
          )}
        </div>
      </div>

      <div>
        <Label>Buscar livro</Label>
        <Input
          value={bookQuery}
          onChange={(e) => {
            setBookQuery(e.target.value);
            setBookId("");
          }}
          placeholder="Título ou autor (≥ 2 letras)"
        />
        {bookOptions.length > 0 && !bookId && (
          <div className="mt-2 max-h-40 overflow-y-auto rounded border bg-card">
            {bookOptions.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setBookId(b.id);
                  setBookQuery(`${b.title} — ${b.author}`);
                }}
                className="block w-full text-left px-3 py-2 hover:bg-accent text-sm"
              >
                <span className="font-medium">{b.title}</span>{" "}
                <span className="text-muted-foreground">— {b.author}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {b.available_copies}/{b.total_copies}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          disabled={!foundUser || !bookId || busy}
          onClick={async () => {
            if (!foundUser) return;
            setBusy(true);
            try {
              await createLoanDirect({
                userId: foundUser.id,
                bookId,
                libraryId: lib.id,
              });
              toast.success("Empréstimo registrado");
              setCpf("");
              setBookId("");
              setBookQuery("");
              setFoundUser(null);
              qc.invalidateQueries({ queryKey: ["active-loans", lib.id] });
              qc.invalidateQueries({ queryKey: ["admin-books", lib.id] });
            } catch (e: any) {
              toast.error(e.message ?? "Falha");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Registrar empréstimo
        </Button>
      </div>
    </div>
  );
}

/* ============ Suggestions ============ */
function SuggestionsTab() {
  const lib = useLibrary();
  const qc = useQueryClient();
  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["suggestions", lib.id],
    queryFn: () => listSuggestions(lib.id),
  });

  if (isLoading)
    return (
      <div className="text-center py-8">
        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
      </div>
    );
  if (suggestions.length === 0)
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhuma sugestão de leitores ainda.
      </div>
    );

  const updateStatus = async (s: Suggestion, status: Suggestion["status"]) => {
    try {
      await updateSuggestionStatus(s.id, status);
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["suggestions", lib.id] });
    } catch (e: any) {
      toast.error(e.message ?? "Falha");
    }
  };

  return (
    <div className="space-y-3">
      {suggestions.map((s) => (
        <div key={s.id} className="rounded-lg border bg-card p-4">
          <div className="flex justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="font-serif text-lg">{s.title}</div>
              {s.author && <div className="text-sm text-muted-foreground">{s.author}</div>}
              {s.reason && <p className="text-sm mt-2">{s.reason}</p>}
              <div className="text-xs text-muted-foreground mt-2">
                sugerido por {s.reader_email ?? "leitor"} ·{" "}
                {format(new Date(s.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Badge variant={
                s.status === "acquired"
                  ? "default"
                  : s.status === "rejected"
                    ? "destructive"
                    : "secondary"
              }>
                {s.status}
              </Badge>
              <Select
                value={s.status}
                onValueChange={(v) => updateStatus(s, v as Suggestion["status"])}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Em aberto</SelectItem>
                  <SelectItem value="accepted">Aceita</SelectItem>
                  <SelectItem value="rejected">Recusada</SelectItem>
                  <SelectItem value="acquired">Adquirida</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============ Users ============ */
function UsersTab() {
  const lib = useLibrary();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["library-users", lib.id],
    queryFn: () => listLibraryUsers(lib.id),
  });

  const setAdminM = useMutation({
    mutationFn: (input: { userId: string; makeAdmin: boolean }) =>
      setAdminRole({ libraryId: lib.id, ...input }),
    onSuccess: () => {
      toast.success("Atualizado");
      qc.invalidateQueries({ queryKey: ["library-users", lib.id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha"),
  });

  const unblockM = useMutation({
    mutationFn: (userId: string) => unblockUser(lib.id, userId),
    onSuccess: () => {
      toast.success("Leitor desbloqueado");
      qc.invalidateQueries({ queryKey: ["library-users", lib.id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha"),
  });

  if (isLoading)
    return (
      <div className="text-center py-8">
        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
      </div>
    );

  return (
    <div className="rounded-xl border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome / E-mail</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Bloqueio</TableHead>
            <TableHead>Papel</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u: LibraryUser) => (
            <TableRow key={u.id}>
              <TableCell>
                <div className="font-medium">{u.name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    u.verification_status === "verified"
                      ? "default"
                      : u.verification_status === "rejected"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {u.verification_status}
                </Badge>
              </TableCell>
              <TableCell>
                {u.is_blocked ? (
                  <Badge variant="destructive">bloqueado</Badge>
                ) : (
                  <Badge variant="outline">livre</Badge>
                )}
              </TableCell>
              <TableCell>
                {u.is_admin ? (
                  <Badge className="bg-primary/15 text-primary border-primary/30" variant="outline">
                    bibliotecária
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">leitor</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {u.is_blocked && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => unblockM.mutate(u.id)}
                      disabled={unblockM.isPending}
                    >
                      Desbloquear
                    </Button>
                  )}
                  {u.id !== user?.id && (
                    u.is_admin ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAdminM.mutate({ userId: u.id, makeAdmin: false })}
                        disabled={setAdminM.isPending}
                        className="gap-1"
                      >
                        <ShieldOff className="h-3.5 w-3.5" />
                        Remover admin
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAdminM.mutate({ userId: u.id, makeAdmin: true })}
                        disabled={setAdminM.isPending}
                        className="gap-1"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        Tornar admin
                      </Button>
                    )
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {users.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <UserX className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
          Nenhum leitor cadastrado ainda nesta biblioteca.
        </div>
      )}
    </div>
  );
}
