import { useAuth } from "@/_core/hooks/useAuth";
import { PageShell } from "@/components/PageShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  FileCheck2,
  HourglassIcon,
  RefreshCw,
  ShieldAlert,
  Upload,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatDate(d?: Date | string | null) {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function daysBetween(later: Date, earlier: Date) {
  const ms = later.getTime() - earlier.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default function MinhaConta() {
  const { user, loading } = useAuth();

  const profileQuery = trpc.profile.me.useQuery(undefined, { enabled: !!user });
  const loansQuery = trpc.loans.myActive.useQuery(undefined, { enabled: !!user });
  const utils = trpc.useUtils();

  const submitMutation = trpc.profile.submitVerification.useMutation({
    onSuccess: () => {
      toast.success("Cadastro enviado para análise. Aguarde a aprovação da bibliotecária.");
      utils.profile.me.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const renewMutation = trpc.loans.renew.useMutation({
    onSuccess: (res) => {
      toast.success(
        `Empréstimo renovado! Nova data de devolução: ${formatDate(res.newDueDate)}`,
      );
      utils.loans.myActive.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Form state
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [identityFile, setIdentityFile] = useState<File | null>(null);
  const [addressFile, setAddressFile] = useState<File | null>(null);

  useEffect(() => {
    if (profileQuery.data?.profile) {
      setCpf(profileQuery.data.profile.cpf ?? "");
      setPhone(profileQuery.data.profile.phone ?? "");
      setAddress(profileQuery.data.profile.address ?? "");
    }
  }, [profileQuery.data?.profile?.userId]);

  if (loading) {
    return (
      <PageShell>
        <div className="container py-20 flex items-center justify-center">
          <Spinner />
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <div className="container py-16 max-w-lg">
          <Card>
            <CardContent className="py-12 text-center">
              <h2 className="font-serif text-2xl mb-2">Acesso restrito</h2>
              <p className="text-muted-foreground mb-6">
                Faça seu cadastro ou entre para acessar sua área pessoal.
              </p>
              <Button
                size="lg"
                onClick={() => {
                  window.location.href = getLoginUrl();
                }}
              >
                Entrar / Cadastrar
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    );
  }

  const status = profileQuery.data?.profile?.verificationStatus ?? "pending";
  const isBlocked = profileQuery.data?.profile?.isBlocked ?? false;
  const blockReason = profileQuery.data?.profile?.blockReason ?? null;

  const onSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identityFile || !addressFile) {
      toast.error("Envie os dois documentos (identidade e comprovante).");
      return;
    }
    if (identityFile.size > 5 * 1024 * 1024 || addressFile.size > 5 * 1024 * 1024) {
      toast.error("Cada arquivo deve ter no máximo 5 MB.");
      return;
    }
    const idB64 = await fileToBase64(identityFile);
    const addrB64 = await fileToBase64(addressFile);
    submitMutation.mutate({
      cpf,
      phone,
      address,
      identityFile: {
        base64: idB64,
        mimeType: identityFile.type || "application/octet-stream",
        fileName: identityFile.name,
      },
      addressFile: {
        base64: addrB64,
        mimeType: addressFile.type || "application/octet-stream",
        fileName: addressFile.name,
      },
    });
  };

  return (
    <PageShell>
      <div className="container py-8 max-w-4xl">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">
            Minha conta
          </p>
          <h1
            className="font-serif text-3xl md:text-4xl text-foreground"
            style={{ fontWeight: 600 }}
          >
            Olá, {user.name?.split(" ")[0] ?? "leitor(a)"} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe seu cadastro e seus empréstimos da Biblioteca Cruz e Sousa.
          </p>
        </header>

        {/* Status do cadastro */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              Situação do cadastro
              <StatusBadge status={status} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isBlocked ? (
              <Alert variant="destructive" className="mb-4">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Conta temporariamente bloqueada</AlertTitle>
                <AlertDescription>
                  {blockReason ?? "Procure a bibliotecária para regularizar."}
                </AlertDescription>
              </Alert>
            ) : null}

            {status === "verified" ? (
              <p className="text-sm text-muted-foreground">
                Seu cadastro está aprovado. Você pode retirar livros na biblioteca
                apresentando seu CPF.
              </p>
            ) : status === "submitted" ? (
              <Alert className="border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200">
                <HourglassIcon className="h-4 w-4" />
                <AlertTitle>Em análise pela bibliotecária</AlertTitle>
                <AlertDescription>
                  Recebemos seus dados e documentos. O processo pode levar até 7
                  dias úteis. Você pode consultar livros, mas o empréstimo
                  acontece após a aprovação.
                </AlertDescription>
              </Alert>
            ) : status === "rejected" ? (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Cadastro recusado</AlertTitle>
                <AlertDescription>
                  Motivo:{" "}
                  {profileQuery.data?.profile?.rejectionReason ??
                    "Procure a biblioteca para mais informações."}
                  <div className="mt-2 text-sm">
                    Você pode reenviar os dados abaixo após corrigir.
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <p className="text-sm text-muted-foreground">
                Para retirar livros, complete seu cadastro abaixo. A bibliotecária
                revisa manualmente — leva no máximo 7 dias úteis.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Formulário de verificação - mostra se pending, submitted (read-only?) ou rejected */}
        {status !== "verified" ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-serif text-xl">
                {status === "submitted" ? "Dados enviados" : "Complete seu cadastro"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmitVerification} className="grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    disabled={status === "submitted"}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(47) 9XXXX-XXXX"
                    disabled={status === "submitted"}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Endereço completo</Label>
                  <Textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua, número, bairro, cidade — Schroeder/SC"
                    disabled={status === "submitted"}
                    rows={2}
                    required
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <FileField
                    label="Documento com foto (RG ou CNH)"
                    file={identityFile}
                    setFile={setIdentityFile}
                    disabled={status === "submitted"}
                  />
                  <FileField
                    label="Comprovante de residência"
                    file={addressFile}
                    setFile={setAddressFile}
                    disabled={status === "submitted"}
                  />
                </div>

                {status !== "submitted" ? (
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                      Seus documentos são usados apenas para a aprovação do cadastro
                      pela bibliotecária responsável.
                    </p>
                    <Button
                      type="submit"
                      size="lg"
                      disabled={submitMutation.isPending}
                    >
                      {submitMutation.isPending ? (
                        <>
                          <Spinner className="mr-2" /> Enviando…
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          {status === "rejected" ? "Reenviar para análise" : "Enviar para análise"}
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Seus dados estão em análise. Você pode atualizar caso a
                    bibliotecária solicite.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        ) : null}

        {/* Empréstimos ativos */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Meus empréstimos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loansQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : !loansQuery.data || loansQuery.data.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Você não tem empréstimos ativos no momento.
              </p>
            ) : (
              <ul className="divide-y">
                {loansQuery.data.map((row) => {
                  const due = new Date(row.loan.dueDate);
                  const now = new Date();
                  const daysToDue = daysBetween(due, now);
                  const isLate = daysToDue < 0;
                  const isCloseToDue = daysToDue >= 0 && daysToDue <= 3;
                  return (
                    <li key={row.loan.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p
                          className="font-serif text-base text-foreground truncate"
                          style={{ fontWeight: 600 }}
                        >
                          {row.book.title}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {row.book.author} · exemplar{" "}
                          <span className="font-mono">
                            {row.copy.copyCode}
                          </span>
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2 text-xs">
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            Devolver até {formatDate(due)}
                          </Badge>
                          {isLate ? (
                            <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/5">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {Math.abs(daysToDue)} dia(s) atrasado
                            </Badge>
                          ) : isCloseToDue ? (
                            <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-0">
                              {daysToDue === 0 ? "Vence hoje" : `${daysToDue} dia(s) restantes`}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              {daysToDue} dia(s) restantes
                            </Badge>
                          )}
                          <Badge variant="outline">
                            Renovações: {row.loan.renewalCount}/2
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          row.loan.renewalCount >= 2 ||
                          isLate ||
                          renewMutation.isPending
                        }
                        onClick={() =>
                          renewMutation.mutate({ loanId: row.loan.id })
                        }
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Renovar +15 dias
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "verified")
    return (
      <Badge className="bg-primary/10 text-primary border-0">
        <CheckCircle2 className="h-3 w-3 mr-1" /> Verificado
      </Badge>
    );
  if (status === "submitted")
    return (
      <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-0">
        <HourglassIcon className="h-3 w-3 mr-1" /> Em análise
      </Badge>
    );
  if (status === "rejected")
    return (
      <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/5">
        <XCircle className="h-3 w-3 mr-1" /> Recusado
      </Badge>
    );
  return (
    <Badge variant="outline">
      <FileCheck2 className="h-3 w-3 mr-1" /> Pendente
    </Badge>
  );
}

function FileField({
  label,
  file,
  setFile,
  disabled,
}: {
  label: string;
  file: File | null;
  setFile: (f: File | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <label
        className={`flex flex-col items-center justify-center border border-dashed rounded-lg px-4 py-6 text-center transition-colors ${
          disabled ? "bg-muted/40 cursor-not-allowed" : "hover:bg-accent cursor-pointer"
        }`}
      >
        <Upload className="h-5 w-5 text-muted-foreground mb-2" />
        <span className="text-sm font-medium">
          {file ? file.name : "Toque para enviar (PNG, JPG ou PDF)"}
        </span>
        <span className="text-xs text-muted-foreground mt-0.5">
          {file ? `${(file.size / 1024).toFixed(0)} KB` : "Máx. 5 MB"}
        </span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg,application/pdf"
          className="hidden"
          disabled={disabled}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}
