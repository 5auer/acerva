import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/contexts/AuthContext";
import { useLibrary } from "@/contexts/LibraryContext";
import {
  getMyMembership,
  getMyProfile,
  submitDocument,
  updateMyProfile,
  type MembershipStatus,
} from "@/lib/api/auth";
import { listMyLoans, renewLoan } from "@/lib/api/loans";
import { cancelReservation, listMyReservations } from "@/lib/api/reservations";
import { uploadAddressProof, uploadDocument } from "@/lib/api/storage";
import { createSuggestion } from "@/lib/api/community";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  Lightbulb,
  Loader2,
  ShieldAlert,
  Upload,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

export default function MyAccount() {
  const lib = useLibrary();
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation(`/auth?next=${encodeURIComponent(`/${lib.slug}/conta`)}`);
    }
  }, [loading, user, setLocation, lib.slug]);

  if (loading || !user) {
    return (
      <PageShell>
        <div className="container py-20 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="container py-8 md:py-12 max-w-4xl">
        <h1 className="font-serif text-3xl mb-2">Minha conta</h1>
        <p className="text-muted-foreground mb-6">{user.email}</p>

        <Tabs defaultValue="cadastro">
          <TabsList>
            <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
            <TabsTrigger value="emprestimos">Empréstimos</TabsTrigger>
            <TabsTrigger value="reservas">Reservas</TabsTrigger>
            <TabsTrigger value="sugerir">Sugerir livro</TabsTrigger>
          </TabsList>

          <TabsContent value="cadastro" className="mt-6">
            <CadastroTab userId={user.id} libraryId={lib.id} />
          </TabsContent>
          <TabsContent value="emprestimos" className="mt-6">
            <EmprestimosTab userId={user.id} libraryId={lib.id} />
          </TabsContent>
          <TabsContent value="reservas" className="mt-6">
            <ReservasTab userId={user.id} libraryId={lib.id} slug={lib.slug} />
          </TabsContent>
          <TabsContent value="sugerir" className="mt-6">
            <SugerirTab libraryId={lib.id} />
          </TabsContent>
        </Tabs>
      </section>
    </PageShell>
  );
}

function CadastroTab({ userId, libraryId }: { userId: string; libraryId: string }) {
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["my-profile", userId],
    queryFn: () => getMyProfile(userId),
  });
  const { data: membership } = useQuery({
    queryKey: ["membership", libraryId, userId],
    queryFn: () => getMyMembership(libraryId, userId),
  });

  return (
    <div className="space-y-6">
      <VerificationStatusBanner
        status={membership?.verification_status ?? "pending"}
        reason={membership?.rejection_reason}
      />

      <ProfileForm
        profile={profile ?? null}
        onSaved={() => qc.invalidateQueries({ queryKey: ["my-profile", userId] })}
        userId={userId}
      />

      <AddressForm
        membership={membership ?? null}
        userId={userId}
        libraryId={libraryId}
        onSaved={() =>
          qc.invalidateQueries({ queryKey: ["membership", libraryId, userId] })
        }
      />

      <DocumentSection
        userId={userId}
        libraryId={libraryId}
        membership={membership ?? null}
        onSaved={() =>
          qc.invalidateQueries({ queryKey: ["membership", libraryId, userId] })
        }
      />
    </div>
  );
}

function VerificationStatusBanner({
  status,
  reason,
}: {
  status: "pending" | "submitted" | "verified" | "rejected";
  reason: string | null | undefined;
}) {
  if (status === "verified")
    return (
      <Alert className="border-green-500/30 bg-green-500/5">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle>Cadastro verificado</AlertTitle>
        <AlertDescription>
          Você pode reservar livros, fazer empréstimos e avaliar leituras.
        </AlertDescription>
      </Alert>
    );
  if (status === "submitted")
    return (
      <Alert className="border-amber-500/30 bg-amber-500/5">
        <Clock className="h-4 w-4 text-amber-600" />
        <AlertTitle>Em análise</AlertTitle>
        <AlertDescription>
          A bibliotecária está revisando seus documentos. Você receberá um e-mail quando for
          aprovado.
        </AlertDescription>
      </Alert>
    );
  if (status === "rejected")
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Cadastro rejeitado</AlertTitle>
        <AlertDescription>{reason ?? "Reenvie um documento válido."}</AlertDescription>
      </Alert>
    );
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Cadastro pendente</AlertTitle>
      <AlertDescription>
        Complete seus dados, endereço e envie um documento (CNH ou RG) + comprovante de residência
        para a bibliotecária aprovar.
      </AlertDescription>
    </Alert>
  );
}

function ProfileForm({
  profile,
  userId,
  onSaved,
}: {
  profile: { name: string | null; cpf: string | null; phone: string | null } | null;
  userId: string;
  onSaved: () => void;
}) {
  const [name, setName] = useState(profile?.name ?? "");
  const [cpf, setCpf] = useState(profile?.cpf ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(profile?.name ?? "");
    setCpf(profile?.cpf ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await updateMyProfile(userId, { name, cpf, phone });
          toast.success("Dados salvos");
          onSaved();
        } catch (err: any) {
          toast.error(err.message ?? "Falha ao salvar");
        } finally {
          setBusy(false);
        }
      }}
      className="rounded-xl border bg-card p-6 space-y-4"
    >
      <h2 className="font-serif text-xl">Seus dados</h2>
      <div>
        <Label htmlFor="name">Nome completo</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cpf">CPF</Label>
          <Input
            id="cpf"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            placeholder="000.000.000-00"
          />
        </div>
        <div>
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(47) 99999-0000"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar
        </Button>
      </div>
    </form>
  );
}

function AddressForm({
  membership,
  userId,
  libraryId,
  onSaved,
}: {
  membership: MembershipStatus | null;
  userId: string;
  libraryId: string;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    address: membership?.address ?? "",
    address_number: membership?.address_number ?? "",
    address_complement: membership?.address_complement ?? "",
    address_neighborhood: membership?.address_neighborhood ?? "",
    address_city: membership?.address_city ?? "",
    address_state: membership?.address_state ?? "",
    address_zip: membership?.address_zip ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [proofBusy, setProofBusy] = useState(false);
  const proofRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (membership) {
      setForm({
        address: membership.address ?? "",
        address_number: membership.address_number ?? "",
        address_complement: membership.address_complement ?? "",
        address_neighborhood: membership.address_neighborhood ?? "",
        address_city: membership.address_city ?? "",
        address_state: membership.address_state ?? "",
        address_zip: membership.address_zip ?? "",
      });
    }
  }, [membership]);

  // We use submit_document RPC even for address-only updates because it consolidates everything.
  // For an address-only update we still need doc_type + doc_number + doc_image_url, so we
  // require the doc to be submitted first.

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <h2 className="font-serif text-xl">Endereço</h2>
      <p className="text-sm text-muted-foreground">
        Necessário pra confirmar residência no município. Os dados ficam visíveis só pra você e
        pra bibliotecária.
      </p>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <Label htmlFor="address">Logradouro (rua/av.)</Label>
          <Input
            id="address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Ex.: Rua Marechal Castelo Branco"
          />
        </div>
        <div>
          <Label htmlFor="addr-num">Número</Label>
          <Input
            id="addr-num"
            value={form.address_number}
            onChange={(e) => setForm({ ...form, address_number: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="addr-comp">Complemento</Label>
          <Input
            id="addr-comp"
            value={form.address_complement}
            onChange={(e) => setForm({ ...form, address_complement: e.target.value })}
            placeholder="Apto, fundos…"
          />
        </div>
        <div>
          <Label htmlFor="addr-bairro">Bairro</Label>
          <Input
            id="addr-bairro"
            value={form.address_neighborhood}
            onChange={(e) => setForm({ ...form, address_neighborhood: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="addr-cep">CEP</Label>
          <Input
            id="addr-cep"
            value={form.address_zip}
            onChange={(e) => setForm({ ...form, address_zip: e.target.value })}
            placeholder="00000-000"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="addr-city">Cidade</Label>
          <Input
            id="addr-city"
            value={form.address_city}
            onChange={(e) => setForm({ ...form, address_city: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="addr-uf">UF</Label>
          <Input
            id="addr-uf"
            value={form.address_state}
            onChange={(e) => setForm({ ...form, address_state: e.target.value })}
            maxLength={2}
            placeholder="SC"
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <Label className="mb-1 block">Comprovante de residência</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Conta de luz/água/internet em seu nome ou de familiar com endereço idêntico ao informado.
        </p>
        <div className="flex items-center gap-3">
          {membership?.address_proof_url ? (
            <a
              href={membership.address_proof_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <FileCheck className="h-4 w-4" />
              Ver comprovante enviado{" "}
              {membership.address_proof_submitted_at &&
                `(${format(new Date(membership.address_proof_submitted_at), "dd/MM/yy", { locale: ptBR })})`}
            </a>
          ) : (
            <span className="text-sm text-muted-foreground">Nenhum comprovante enviado</span>
          )}
          <input
            ref={proofRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (!membership?.doc_image_url) {
                toast.error(
                  "Envie primeiro o documento de identificação (CNH/RG) abaixo, depois o comprovante.",
                );
                if (proofRef.current) proofRef.current.value = "";
                return;
              }
              setProofBusy(true);
              try {
                const url = await uploadAddressProof(userId, file);
                await submitDocument({
                  libraryId,
                  docType: (membership.doc_type as "cnh" | "rg") ?? "cnh",
                  docNumber: membership.doc_number ?? "",
                  docImageUrl: membership.doc_image_url ?? "",
                  address: form.address || undefined,
                  addressNumber: form.address_number || undefined,
                  addressComplement: form.address_complement || undefined,
                  addressNeighborhood: form.address_neighborhood || undefined,
                  addressCity: form.address_city || undefined,
                  addressState: form.address_state || undefined,
                  addressZip: form.address_zip || undefined,
                  addressProofUrl: url,
                });
                toast.success("Comprovante enviado");
                onSaved();
              } catch (err: any) {
                toast.error(err.message ?? "Falha ao enviar");
              } finally {
                setProofBusy(false);
                if (proofRef.current) proofRef.current.value = "";
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => proofRef.current?.click()}
            disabled={proofBusy}
            className="gap-2"
          >
            {proofBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {membership?.address_proof_url ? "Reenviar" : "Enviar comprovante"}
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          disabled={busy || !membership?.doc_image_url}
          title={!membership?.doc_image_url ? "Envie o documento de identidade primeiro" : undefined}
          onClick={async () => {
            if (!membership?.doc_image_url) return;
            setBusy(true);
            try {
              await submitDocument({
                libraryId,
                docType: (membership.doc_type as "cnh" | "rg") ?? "cnh",
                docNumber: membership.doc_number ?? "",
                docImageUrl: membership.doc_image_url,
                address: form.address || undefined,
                addressNumber: form.address_number || undefined,
                addressComplement: form.address_complement || undefined,
                addressNeighborhood: form.address_neighborhood || undefined,
                addressCity: form.address_city || undefined,
                addressState: form.address_state || undefined,
                addressZip: form.address_zip || undefined,
              });
              toast.success("Endereço salvo");
              onSaved();
            } catch (err: any) {
              toast.error(err.message ?? "Falha ao salvar");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar endereço
        </Button>
      </div>
    </div>
  );
}

function DocumentSection({
  userId,
  libraryId,
  membership,
  onSaved,
}: {
  userId: string;
  libraryId: string;
  membership: MembershipStatus | null;
  onSaved: () => void;
}) {
  const [docType, setDocType] = useState<"cnh" | "rg">(
    (membership?.doc_type as "cnh" | "rg") ?? "cnh",
  );
  const [docNumber, setDocNumber] = useState<string>(membership?.doc_number ?? "");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (membership) {
      setDocType((membership.doc_type as "cnh" | "rg") ?? "cnh");
      setDocNumber(membership.doc_number ?? "");
    }
  }, [membership]);

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <h2 className="font-serif text-xl">Documento de identificação</h2>
      <p className="text-sm text-muted-foreground">
        Foto da CNH ou RG. A bibliotecária verifica e libera o acesso.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Tipo</Label>
          <Select value={docType} onValueChange={(v) => setDocType(v as "cnh" | "rg")}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cnh">CNH</SelectItem>
              <SelectItem value="rg">RG</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="doc-number">Número</Label>
          <Input
            id="doc-number"
            value={docNumber}
            onChange={(e) => setDocNumber(e.target.value)}
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <Label className="mb-1 block">Foto do documento</Label>
        {membership?.doc_image_url && (
          <a
            href={membership.doc_image_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-2"
          >
            <FileCheck className="h-4 w-4" />
            Ver documento enviado
            {membership.doc_submitted_at &&
              ` (${format(new Date(membership.doc_submitted_at), "dd/MM/yy", { locale: ptBR })})`}
          </a>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (!docNumber.trim()) {
              toast.error("Informe o número do documento primeiro");
              return;
            }
            setBusy(true);
            try {
              const url = await uploadDocument(userId, file);
              await submitDocument({
                libraryId,
                docType,
                docNumber,
                docImageUrl: url,
                address: membership?.address ?? undefined,
                addressNumber: membership?.address_number ?? undefined,
                addressComplement: membership?.address_complement ?? undefined,
                addressNeighborhood: membership?.address_neighborhood ?? undefined,
                addressCity: membership?.address_city ?? undefined,
                addressState: membership?.address_state ?? undefined,
                addressZip: membership?.address_zip ?? undefined,
                addressProofUrl: membership?.address_proof_url ?? undefined,
              });
              toast.success("Documento enviado para análise");
              onSaved();
            } catch (err: any) {
              toast.error(err.message ?? "Falha ao enviar");
            } finally {
              setBusy(false);
              if (fileRef.current) fileRef.current.value = "";
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="mt-1 gap-2"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {membership?.doc_image_url ? "Reenviar documento" : "Enviar documento"}
        </Button>
      </div>
    </div>
  );
}

function EmprestimosTab({ userId, libraryId }: { userId: string; libraryId: string }) {
  const qc = useQueryClient();
  const { data: loans = [], isLoading } = useQuery({
    queryKey: ["my-loans", libraryId, userId],
    queryFn: () => listMyLoans(libraryId, userId),
  });

  const renewM = useMutation({
    mutationFn: (loanId: string) => renewLoan(loanId),
    onSuccess: () => {
      toast.success("Empréstimo renovado");
      qc.invalidateQueries({ queryKey: ["my-loans"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao renovar"),
  });

  if (isLoading)
    return (
      <div className="text-center py-8">
        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  if (loans.length === 0)
    return (
      <div className="text-center py-12 text-muted-foreground">
        Você ainda não tem empréstimos.
      </div>
    );

  return (
    <div className="space-y-3">
      {loans.map((l) => {
        const overdue = l.status === "active" && new Date(l.due_date) < new Date();
        return (
          <div key={l.id} className="rounded-lg border bg-card p-4 flex gap-4">
            <div className="w-16 h-24 rounded overflow-hidden bg-muted shrink-0 flex items-center justify-center">
              {l.book?.cover_url ? (
                <img src={l.book.cover_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <BookOpen className="h-5 w-5 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-serif text-base line-clamp-1">{l.book?.title}</div>
              <div className="text-sm text-muted-foreground line-clamp-1">{l.book?.author}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <Badge
                  variant={
                    l.status === "returned"
                      ? "secondary"
                      : overdue
                        ? "destructive"
                        : "default"
                  }
                >
                  {l.status === "returned"
                    ? `devolvido em ${format(new Date(l.returned_at!), "dd/MM/yy", { locale: ptBR })}`
                    : overdue
                      ? "atrasado"
                      : "em curso"}
                </Badge>
                <span className="text-muted-foreground">
                  vencimento: {format(new Date(l.due_date), "dd/MM/yyyy", { locale: ptBR })}
                </span>
                <span className="text-muted-foreground">renovações: {l.renewal_count}/1</span>
              </div>
            </div>
            {l.status === "active" && !overdue && l.renewal_count < 1 && (
              <div className="self-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => renewM.mutate(l.id)}
                  disabled={renewM.isPending}
                >
                  Renovar +15 dias
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ReservasTab({
  userId,
  libraryId,
  slug,
}: {
  userId: string;
  libraryId: string;
  slug: string;
}) {
  const qc = useQueryClient();
  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ["my-reservations", libraryId, userId],
    queryFn: () => listMyReservations(libraryId, userId),
  });

  const cancelM = useMutation({
    mutationFn: (id: string) => cancelReservation(id),
    onSuccess: () => {
      toast.success("Reserva cancelada");
      qc.invalidateQueries({ queryKey: ["my-reservations"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao cancelar"),
  });

  if (isLoading)
    return (
      <div className="text-center py-8">
        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  if (reservations.length === 0)
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ShieldAlert className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
        Você não tem reservas ativas.
      </div>
    );

  return (
    <div className="space-y-3">
      {reservations.map((r) => {
        const expired = new Date(r.expires_at) < new Date();
        return (
          <div key={r.id} className="rounded-lg border bg-card p-4 flex gap-4">
            <div className="w-16 h-24 rounded overflow-hidden bg-muted shrink-0">
              {r.book?.cover_url ? (
                <img src={r.book.cover_url} alt="" className="w-full h-full object-cover" />
              ) : null}
            </div>
            <div className="flex-1 min-w-0">
              <Link
                href={`/${slug}/livros/${r.book_id}`}
                className="font-serif text-base hover:underline line-clamp-1"
              >
                {r.book?.title}
              </Link>
              <div className="text-sm text-muted-foreground line-clamp-1">{r.book?.author}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <Badge
                  variant={
                    r.status === "fulfilled"
                      ? "default"
                      : expired
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {r.status === "fulfilled"
                    ? "retirada efetuada"
                    : expired
                      ? "expirada (não retirada)"
                      : "aguardando retirada"}
                </Badge>
                {r.status === "pending" && (
                  <span className="text-muted-foreground">
                    expira: {format(new Date(r.expires_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                )}
              </div>
            </div>
            {r.status === "pending" && (
              <div className="self-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => cancelM.mutate(r.id)}
                  disabled={cancelM.isPending}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SugerirTab({ libraryId }: { libraryId: string }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (title.trim().length < 2) {
          toast.error("Informe o título");
          return;
        }
        setBusy(true);
        try {
          await createSuggestion({
            libraryId,
            title: title.trim(),
            author: author.trim() || undefined,
            reason: reason.trim() || undefined,
          });
          toast.success("Sugestão enviada — obrigado!");
          setTitle("");
          setAuthor("");
          setReason("");
        } catch (err: any) {
          toast.error(err.message ?? "Falha ao enviar");
        } finally {
          setBusy(false);
        }
      }}
      className="rounded-xl border bg-card p-6 space-y-4 max-w-2xl"
    >
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="h-5 w-5 text-amber-500" />
        <h2 className="font-serif text-xl m-0">Sugerir livro pra biblioteca</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Sentiu falta de algum título? Sugira aqui — a bibliotecária analisa cada pedido.
      </p>

      <div>
        <Label htmlFor="sug-title">Título *</Label>
        <Input
          id="sug-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="sug-author">Autor</Label>
        <Input
          id="sug-author"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="sug-reason">Por que esse livro?</Label>
        <Textarea
          id="sug-reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex.: Importante pra educação infantil, livro que vi indicação na escola, etc."
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Enviar sugestão
        </Button>
      </div>
    </form>
  );
}
