import { supabase } from "@/integrations/supabase/client";

export type Review = {
  id: string;
  user_id: string;
  book_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reader_name?: string | null;
};

export async function listReviewsForBook(bookId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from("book_reviews")
    .select("id, user_id, book_id, rating, comment, created_at")
    .eq("book_id", bookId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const userIds = Array.from(new Set((data ?? []).map((r) => r.user_id)));
  let profiles: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, name, email")
      .in("id", userIds);
    profiles = Object.fromEntries(
      (profs ?? []).map((p) => [p.id, p.name ?? p.email?.split("@")[0] ?? "Leitor"]),
    );
  }
  return (data ?? []).map((r) => ({ ...r, reader_name: profiles[r.user_id] ?? "Leitor" }));
}

export async function upsertReview(input: {
  bookId: string;
  libraryId: string;
  rating: number;
  comment?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc("upsert_book_review", {
    _book_id: input.bookId,
    _library_id: input.libraryId,
    _rating: input.rating,
    _comment: input.comment ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function getMyReview(bookId: string, userId: string): Promise<Review | null> {
  const { data, error } = await supabase
    .from("book_reviews")
    .select("id, user_id, book_id, rating, comment, created_at")
    .eq("book_id", bookId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}
