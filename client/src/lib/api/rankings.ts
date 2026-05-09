import { supabase } from "@/integrations/supabase/client";

export type Period = "month" | "semester" | "year" | "all";

export type TopReader = { user_id: string; name: string; total: number };
export type TopBook = {
  book_id: string;
  title: string;
  author: string;
  cover_url: string | null;
  total: number;
};
export type PublicStats = {
  total_books: number;
  total_copies: number;
  total_readers: number;
  total_loans: number;
  total_categories: number;
};

export async function getTopReaders(
  libraryId: string,
  period: Period = "month",
  limit = 10,
): Promise<TopReader[]> {
  const { data, error } = await supabase.rpc("get_top_readers", {
    _library_id: libraryId,
    _period: period,
    _limit: limit,
  });
  if (error) throw error;
  return (data as TopReader[]) ?? [];
}

export async function getTopBooks(
  libraryId: string,
  period: Period = "month",
  limit = 10,
): Promise<TopBook[]> {
  const { data, error } = await supabase.rpc("get_top_books", {
    _library_id: libraryId,
    _period: period,
    _limit: limit,
  });
  if (error) throw error;
  return (data as TopBook[]) ?? [];
}

export async function getMostLoanedBooks(libraryId: string, limit = 8): Promise<TopBook[]> {
  const { data, error } = await supabase.rpc("get_most_loaned_books", {
    _library_id: libraryId,
    _limit: limit,
  });
  if (error) throw error;
  return (data as TopBook[]) ?? [];
}

export async function getPublicStats(libraryId: string): Promise<PublicStats> {
  const { data, error } = await supabase.rpc("get_public_stats", { _library_id: libraryId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as PublicStats) ?? {
    total_books: 0,
    total_copies: 0,
    total_readers: 0,
    total_loans: 0,
    total_categories: 0,
  };
}
