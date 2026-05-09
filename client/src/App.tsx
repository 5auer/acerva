import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { LibraryProvider, useLibraryState } from "@/contexts/LibraryContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";
import { Route, Switch, useLocation } from "wouter";
import About from "@/pages/About";
import Admin from "@/pages/Admin";
import Auth from "@/pages/Auth";
import BookDetails from "@/pages/BookDetails";
import Catalog from "@/pages/Catalog";
import LibrarySelect from "@/pages/LibrarySelect";
import MyAccount from "@/pages/MyAccount";
import NotFound from "@/pages/NotFound";
import Rankings from "@/pages/Rankings";

const RESERVED_ROOT_SLUGS = new Set(["auth", "404"]);

function LibraryRoutes() {
  const { library, loading, error } = useLibraryState();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !library) {
    return <NotFound message={error ?? "Biblioteca não encontrada"} />;
  }

  return (
    <AuthProvider libraryId={library.id}>
      <Switch>
        <Route path="/:slug" component={Catalog} />
        <Route path="/:slug/livros/:id" component={BookDetails} />
        <Route path="/:slug/conta" component={MyAccount} />
        <Route path="/:slug/admin" component={Admin} />
        <Route path="/:slug/rankings" component={Rankings} />
        <Route path="/:slug/sobre" component={About} />
        <Route>
          <NotFound />
        </Route>
      </Switch>
    </AuthProvider>
  );
}

function Router() {
  const [location] = useLocation();
  const firstSegment = location.split("/").filter(Boolean)[0] ?? null;

  if (!firstSegment || RESERVED_ROOT_SLUGS.has(firstSegment)) {
    return (
      <AuthProvider libraryId={null}>
        <Switch>
          <Route path="/" component={LibrarySelect} />
          <Route path="/auth" component={Auth} />
          <Route>
            <NotFound />
          </Route>
        </Switch>
      </AuthProvider>
    );
  }

  return (
    <LibraryProvider slug={firstSegment}>
      <LibraryRoutes />
    </LibraryProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
