import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import {
  BookMarked,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Search as SearchIcon,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function AcervaHeader() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  const isAdmin = user?.role === "admin";

  const navLinks: { href: string; label: string; icon?: any }[] = [
    { href: "/", label: "Catálogo", icon: SearchIcon },
  ];
  if (user) {
    navLinks.push({ href: "/minha-conta", label: "Minha conta", icon: UserIcon });
  }
  if (isAdmin) {
    navLinks.push({ href: "/admin", label: "Painel da Bibliotecária", icon: ShieldCheck });
  }

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="group flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-1"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30">
            <BookMarked className="h-5 w-5" />
          </span>
          <div className="hidden sm:flex flex-col leading-tight">
            <span
              className="font-serif text-xl text-foreground"
              style={{ fontWeight: 600 }}
            >
              ACERVA
            </span>
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Biblioteca Cruz e Sousa · Schroeder/SC
            </span>
          </div>
          <div className="sm:hidden flex flex-col leading-tight">
            <span
              className="font-serif text-lg text-foreground"
              style={{ fontWeight: 600 }}
            >
              ACERVA
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const active =
              link.href === "/"
                ? location === "/"
                : location.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  active
                    ? "text-primary bg-primary/10"
                    : "text-foreground/75 hover:text-foreground hover:bg-accent"
                }`}
              >
                {link.icon ? <link.icon className="h-4 w-4" /> : null}
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Abrir menu do usuário"
                >
                  <Avatar className="h-9 w-9 border">
                    <AvatarFallback className="text-xs font-medium">
                      {user.name?.charAt(0)?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium max-w-[140px] truncate">
                    {user.name ?? "Leitor(a)"}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {user.email ?? "Conectado"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href="/minha-conta">
                  <DropdownMenuItem>
                    <UserIcon className="mr-2 h-4 w-4" />
                    Minha conta
                  </DropdownMenuItem>
                </Link>
                {isAdmin ? (
                  <Link href="/admin">
                    <DropdownMenuItem>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Painel da Bibliotecária
                    </DropdownMenuItem>
                  </Link>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                window.location.href = getLoginUrl();
              }}
              className="gap-2"
            >
              <LogIn className="h-4 w-4" />
              Entrar
            </Button>
          )}

          {/* Mobile menu */}
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="md:hidden bg-transparent"
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 md:hidden">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <DropdownMenuItem>
                    {link.icon ? <link.icon className="mr-2 h-4 w-4" /> : null}
                    {link.label}
                  </DropdownMenuItem>
                </Link>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export function AcervaFooter() {
  return (
    <footer className="mt-16 border-t border-border/60 bg-background/60">
      <div className="container py-8 grid gap-6 md:grid-cols-3 text-sm text-muted-foreground">
        <div>
          <p className="font-serif text-foreground text-base mb-1">
            Biblioteca Pública Municipal Cruz e Sousa
          </p>
          <p>Schroeder, Santa Catarina</p>
        </div>
        <div>
          <p className="font-medium text-foreground mb-1">Atendimento</p>
          <p>Segunda a sexta · 08h às 17h</p>
          <p>Sábados de evento conforme programação</p>
        </div>
        <div>
          <p className="font-medium text-foreground mb-1">ACERVA</p>
          <p>Catálogo digital construído para ampliar o acesso à leitura na nossa cidade.</p>
        </div>
      </div>
      <div className="acerva-divider" />
      <div className="container py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} ACERVA · Projeto piloto para a Biblioteca Cruz e Sousa
      </div>
    </footer>
  );
}
