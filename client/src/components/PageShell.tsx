import { ReactNode } from "react";
import { AcervaFooter, AcervaHeader } from "./AcervaHeader";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <AcervaHeader />
      <main className="flex-1">{children}</main>
      <AcervaFooter />
    </div>
  );
}
