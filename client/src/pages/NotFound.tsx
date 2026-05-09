import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { BookX } from "lucide-react";

export default function NotFound({ message }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <BookX className="h-12 w-12 text-muted-foreground mb-4" />
      <h1 className="font-serif text-3xl mb-2">Não encontrado</h1>
      <p className="text-muted-foreground max-w-md mb-6">
        {message ?? "A página que você procura não existe ou foi movida."}
      </p>
      <Button asChild>
        <Link href="/">Voltar ao início</Link>
      </Button>
    </div>
  );
}
