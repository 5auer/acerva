import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { signIn, signUp, resetPassword } from "@/lib/api/auth";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Auth() {
  const next = new URLSearchParams(window.location.search).get("next") ?? "/";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container h-16 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/acerva-logo.png"
              alt="ACERVA"
              className="h-10 w-10 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <span className="font-serif text-lg" style={{ fontWeight: 600 }}>
              ACERVA
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <img
              src="/acerva-logo.png"
              alt="ACERVA"
              className="h-16 w-16 mx-auto mb-4 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <h1 className="font-serif text-3xl mb-2">Bem-vindo</h1>
            <p className="text-muted-foreground">
              Entre ou cadastre-se para reservar livros e avaliar leituras.
            </p>
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-6">
              <SignInForm next={next} />
            </TabsContent>
            <TabsContent value="signup" className="mt-6">
              <SignUpForm next={next} />
            </TabsContent>
          </Tabs>

          <p className="text-center text-xs text-muted-foreground">
            <Link href="/" className="hover:underline">
              Voltar ao início
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function SignInForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await signIn({ email, password });
          toast.success("Bem-vindo de volta!");
          window.location.href = next;
        } catch (err: any) {
          toast.error(err.message ?? "Falha ao entrar");
        } finally {
          setBusy(false);
        }
      }}
      className="space-y-4"
    >
      <div>
        <Label htmlFor="signin-email">E-mail</Label>
        <Input
          id="signin-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>
      <div>
        <Label htmlFor="signin-password">Senha</Label>
        <Input
          id="signin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Entrar
      </Button>
      <button
        type="button"
        className="text-xs text-muted-foreground hover:underline w-full text-center"
        onClick={async () => {
          if (!email) return toast.error("Informe seu e-mail primeiro");
          try {
            await resetPassword(email, `${window.location.origin}/auth`);
            toast.success("E-mail de redefinição enviado");
          } catch (e: any) {
            toast.error(e.message ?? "Falha ao enviar");
          }
        }}
      >
        Esqueci minha senha
      </button>
    </form>
  );
}

function SignUpForm({ next }: { next: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (password.length < 6) return toast.error("Senha precisa ter ao menos 6 caracteres");
        setBusy(true);
        try {
          const res = await signUp({ email, password, name });
          if (res.session) {
            toast.success("Cadastro criado!");
            window.location.href = next;
          } else {
            toast.success("Cadastro criado — verifique seu e-mail para confirmar.");
          }
        } catch (err: any) {
          toast.error(err.message ?? "Falha ao cadastrar");
        } finally {
          setBusy(false);
        }
      }}
      className="space-y-4"
    >
      <div>
        <Label htmlFor="signup-name">Nome</Label>
        <Input
          id="signup-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
        />
      </div>
      <div>
        <Label htmlFor="signup-email">E-mail</Label>
        <Input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>
      <div>
        <Label htmlFor="signup-password">Senha</Label>
        <Input
          id="signup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground mt-1">Mínimo de 6 caracteres.</p>
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Cadastrar
      </Button>
    </form>
  );
}
