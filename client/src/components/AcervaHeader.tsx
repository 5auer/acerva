import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useLibrary } from "@/contexts/LibraryContext";
import { signOut } from "@/lib/api/auth";
import {
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Search as SearchIcon,
  ShieldCheck,
  Trophy,
  User as UserIcon,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

export function AcervaHeader() {
  const lib = useLibrary();
  const { user, isAdmin } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const base = `/${lib.slug}`;
  const navLinks: { href: string; label: string; icon?: any }[] = [
    { href: base, label: "Início", icon: SearchIcon },
    { href: `${base}#catalogo`, label: "Catálogo", icon: SearchIcon },
    { href: `${base}/rankings`, label: "Rankings", icon: Trophy },
  ];
  if (user) navLinks.push({ href: `${base}/conta`, label: "Minha conta", icon: UserIcon });
  if (isAdmin)
    navLinks.push({ href: `${base}/admin`, label: "Painel", icon: ShieldCheck });

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link
          href={base}
          className="group flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md px-1"
        >
          <img
            src="/acerva-logo.png"
            alt="ACERVA"
            className="h-10 w-10 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="font-serif text-xl text-foreground" style={{ fontWeight: 600 }}>
              ACERVA
            </span>
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {lib.name}{lib.city ? ` · ${lib.city}/${lib.state ?? ""}` : ""}
            </span>
          </div>
          <div className="sm:hidden flex flex-col leading-tight">
            <span className="font-serif text-lg text-foreground" style={{ fontWeight: 600 }}>
              ACERVA
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isAnchor = link.href.includes("#");
            const cleanHref = link.href.split("#")[0];
            const active =
              cleanHref === base
                ? location === base && !isAnchor
                : location.startsWith(cleanHref);
            const cls = `px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              active
                ? "text-primary bg-primary/10"
                : "text-foreground/75 hover:text-foreground hover:bg-accent"
            }`;
            if (isAnchor) {
              return (
                <a key={link.href} href={link.href} className={cls}>
                  {link.icon ? <link.icon className="h-4 w-4" /> : null}
                  {link.label}
                </a>
              );
            }
            return (
              <Link key={link.href} href={link.href} className={cls}>
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
                  aria-label="Menu do usuário"
                >
                  <Avatar className="h-9 w-9 border">
                    <AvatarFallback className="text-xs font-medium">
                      {(user.user_metadata?.name as string | undefined)?.charAt(0)?.toUpperCase() ??
                        user.email?.charAt(0)?.toUpperCase() ??
                        "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium max-w-[140px] truncate">
                    {(user.user_metadata?.name as string | undefined) ?? user.email?.split("@")[0]}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href={`${base}/conta`}>
                  <DropdownMenuItem>
                    <UserIcon className="mr-2 h-4 w-4" />
                    Minha conta
                  </DropdownMenuItem>
                </Link>
                {isAdmin ? (
                  <Link href={`${base}/admin`}>
                    <DropdownMenuItem>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Painel
                    </DropdownMenuItem>
                  </Link>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    window.location.href = base;
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="gap-2">
              <Link href={`/auth?next=${encodeURIComponent(base)}`}>
                <LogIn className="h-4 w-4" />
                Entrar
              </Link>
            </Button>
          )}

          <DropdownMenu open={mobileOpen} onOpenChange={setMobileOpen}>
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
              {navLinks.map((link) => {
                const isAnchor = link.href.includes("#");
                if (isAnchor) {
                  return (
                    <a key={link.href} href={link.href}>
                      <DropdownMenuItem>
                        {link.icon ? <link.icon className="mr-2 h-4 w-4" /> : null}
                        {link.label}
                      </DropdownMenuItem>
                    </a>
                  );
                }
                return (
                  <Link key={link.href} href={link.href}>
                    <DropdownMenuItem>
                      {link.icon ? <link.icon className="mr-2 h-4 w-4" /> : null}
                      {link.label}
                    </DropdownMenuItem>
                  </Link>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export function AcervaFooter() {
  const lib = useLibrary();
  return (
    <footer className="mt-16 border-t border-border/60 bg-background/60">
      <div className="container py-8 grid gap-6 md:grid-cols-3 text-sm text-muted-foreground">
        <div>
          <p className="font-serif text-foreground text-base mb-1">{lib.name}</p>
          <p>{lib.city ? `${lib.city}, ${lib.state ?? ""}` : ""}</p>
        </div>
        <div>
          <p className="font-medium text-foreground mb-1">Atendimento</p>
          <p>Segunda a sexta · 08h às 17h</p>
          <p>Sábados de evento conforme programação</p>
        </div>
        <div>
          <p className="font-medium text-foreground mb-1">ACERVA</p>
          <p>Catálogo digital construído para ampliar o acesso à leitura na sua cidade.</p>
        </div>
      </div>
      <div className="container py-4 text-center text-xs text-muted-foreground border-t border-border/40">
        © {new Date().getFullYear()} ACERVA · {lib.name}
      </div>
    </footer>
  );
}
