import { supabase } from "@/integrations/supabase/client";

export type Loan = {
  id: string;
  library_id: string;
  user_id: string;
  book_id: string;
  copy_id: string;
  loaned_at: string;
  due_date: string;
  returned_at: string | null;
  renewal_count: number;
  days_late: number;
  status: "active" | "returned" | "overdue";
  notes: string | null;
};

export type LoanWithBook = Loan & {
  book: { id: string; title: string; author: string; cover_url: string | null } | null;
  reader_email?: string | null;
  reader_name?: string | null;
};

export async function listMyLoans(libraryId: string, userId: string): Promise<LoanWithBook[]> {
  const { data, error } = await supabase
    .from("loans")
    .select("*, book:books(id, title, author, cover_url)")
    .eq("library_id", libraryId)
    .eq("user_id", userId)
    .order("loaned_at", { ascending: false });
  if (error) throw error;
  return (data as any) ?? [];
}

export async function listActiveLoans(libraryId: string): Promise<LoanWithBook[]> {
  const { data, error } = await supabase
    .from("loans")
    .select("*, book:books(id, title, author, cover_url)")
    .eq("library_id", libraryId)
    .eq("status", "active")
    .order("due_date", { ascending: true });
  if (error) throw error;

  const userIds = Array.from(new Set((data ?? []).map((l: any) => l.user_id)));
  let profiles: Record<string, { name: string | null; email: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, name, email")
      .in("id", userIds);
    profiles = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
  }

  return ((data as any[]) ?? []).map((l) => ({
    ...l,
    reader_name: profiles[l.user_id]?.name ?? null,
    reader_email: profiles[l.user_id]?.email ?? null,
  }));
}

export async function renewLoan(loanId: string): Promise<string> {
  const { data, error } = await supabase.rpc("renew_loan", { _loan_id: loanId });
  if (error) throw error;
  return data as string;
}

export async function returnLoan(loanId: string): Promise<number> {
  const { data, error } = await supabase.rpc("return_loan", { _loan_id: loanId });
  if (error) throw error;
  return (data as number) ?? 0;
}

export async function createLoanDirect(input: {
  userId: string;
  bookId: string;
  libraryId: string;
  notes?: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc("create_loan_direct", {
    _user_id: input.userId,
    _book_id: input.bookId,
    _library_id: input.libraryId,
    _notes: input.notes ?? null,
  });
  if (error) throw error;
  return data as string;
}
