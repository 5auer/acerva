import { supabase } from "@/integrations/supabase/client";

export type Category = { id: string; name: string; slug: string };

export type Book = {
  id: string;
  library_id: string;
  category_id: string | null;
  title: string;
  author: string;
  description: string | null;
  publisher: string | null;
  publication_year: number | null;
  isbn: string | null;
  shelf_location: string | null;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
};

export type BookWithCounts = Book & {
  category: Category | null;
  total_copies: number;
  available_copies: number;
  avg_rating: number | null;
  review_count: number;
};

export type BookInput = {
  title: string;
  author: string;
  category_id: string | null;
  description: string | null;
  publisher: string | null;
  publication_year: number | null;
  isbn: string | null;
  shelf_location: string | null;
  cover_url: string | null;
};

export type BookSearchInput = {
  libraryId: string;
  query?: string;
  categoryId?: string;
  onlyAvailable?: boolean;
  sort?: "title" | "newest" | "rating" | "popular";
};

function withCounts(b: any): BookWithCounts {
  const copies = b.book_copies ?? [];
  const reviews = b.book_reviews ?? [];
  const ratings: number[] = reviews.map((r: any) => r.rating);
  return {
    ...b,
    category: b.category ?? null,
    total_copies: copies.length,
    available_copies: copies.filter((c: any) => c.status === "available").length,
    avg_rating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
    review_count: ratings.length,
  };
}

export async function searchBooks(input: BookSearchInput): Promise<BookWithCounts[]> {
  let q = supabase
    .from("books")
    .select("*, category:categories(*), book_copies(id, status), book_reviews(rating)")
    .eq("library_id", input.libraryId);

  if (input.query?.trim()) {
    const term = input.query.trim();
    q = q.or(`title.ilike.%${term}%,author.ilike.%${term}%`);
  }
  if (input.categoryId) {
    q = q.eq("category_id", input.categoryId);
  }

  switch (input.sort) {
    case "newest":
      q = q.order("created_at", { ascending: false });
      break;
    case "title":
    default:
      q = q.order("title", { ascending: true });
  }

  const { data, error } = await q;
  if (error) throw error;
  let rows = (data ?? []).map(withCounts);
  if (input.onlyAvailable) {
    rows = rows.filter((b) => b.available_copies > 0);
  }
  if (input.sort === "rating") {
    rows.sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0));
  }
  if (input.sort === "popular") {
    rows.sort((a, b) => b.review_count - a.review_count);
  }
  return rows;
}

export async function getBook(id: string): Promise<BookWithCounts | null> {
  const { data, error } = await supabase
    .from("books")
    .select("*, category:categories(*), book_copies(id, status), book_reviews(rating)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return withCounts(data);
}

export async function listCategories(libraryId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("library_id", libraryId)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createBook(libraryId: string, input: BookInput) {
  const { data, error } = await supabase
    .from("books")
    .insert({ ...input, library_id: libraryId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBook(id: string, input: Partial<BookInput>) {
  const { data, error } = await supabase
    .from("books")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBook(id: string) {
  const { error } = await supabase.from("books").delete().eq("id", id);
  if (error) throw error;
}

export async function addCopy(libraryId: string, bookId: string, copyCode: string) {
  const { error } = await supabase.from("book_copies").insert({
    library_id: libraryId,
    book_id: bookId,
    copy_code: copyCode,
    status: "available",
  });
  if (error) throw error;
}

export type CopyStatus =
  | "available"
  | "loaned"
  | "reserved"
  | "maintenance"
  | "discarded";

export type Copy = {
  id: string;
  book_id: string;
  library_id: string;
  copy_code: string;
  status: CopyStatus;
  acquired_at: string;
  discard_reason: string | null;
  discarded_at: string | null;
  discarded_by_user_id: string | null;
};

export async function listBookCopies(bookId: string): Promise<Copy[]> {
  const { data, error } = await supabase
    .from("book_copies")
    .select("*")
    .eq("book_id", bookId)
    .order("acquired_at", { ascending: true });
  if (error) throw error;
  return (data as Copy[]) ?? [];
}

export async function discardCopy(copyId: string, reason: string) {
  const { error } = await supabase.rpc("discard_copy", {
    _copy_id: copyId,
    _reason: reason,
  });
  if (error) throw error;
}

export async function restoreCopy(copyId: string) {
  const { error } = await supabase.rpc("restore_copy", { _copy_id: copyId });
  if (error) throw error;
}

export async function deleteCopyHard(copyId: string) {
  const { error } = await supabase.from("book_copies").delete().eq("id", copyId);
  if (error) throw error;
}

export async function recordView(bookId: string, libraryId: string) {
  await supabase.rpc("record_book_view", { _book_id: bookId, _library_id: libraryId });
}

export async function listRecentBooks(libraryId: string, limit = 8): Promise<BookWithCounts[]> {
  const { data, error } = await supabase
    .from("books")
    .select("*, category:categories(*), book_copies(id, status), book_reviews(rating)")
    .eq("library_id", libraryId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(withCounts);
}
