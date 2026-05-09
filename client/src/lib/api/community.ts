import { supabase } from "@/integrations/supabase/client";

export type Suggestion = {
  id: string;
  library_id: string;
  user_id: string;
  title: string;
  author: string | null;
  reason: string | null;
  status: "open" | "accepted" | "rejected" | "acquired";
  admin_note: string | null;
  created_at: string;
  reader_email?: string | null;
};

export type NotifyRequest = {
  id: string;
  library_id: string;
  user_id: string;
  book_id: string;
  status: "pending" | "notified" | "cancelled";
  created_at: string;
  notified_at: string | null;
};

export async function createSuggestion(input: {
  libraryId: string;
  title: string;
  author?: string;
  reason?: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc("create_book_suggestion", {
    _library_id: input.libraryId,
    _title: input.title,
    _author: input.author ?? null,
    _reason: input.reason ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function listSuggestions(libraryId: string): Promise<Suggestion[]> {
  const { data, error } = await supabase
    .from("book_suggestions")
    .select("*")
    .eq("library_id", libraryId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const userIds = Array.from(new Set((data ?? []).map((s) => s.user_id)));
  let profiles: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, email")
      .in("id", userIds);
    profiles = Object.fromEntries((profs ?? []).map((p) => [p.id, p.email ?? ""]));
  }
  return (data ?? []).map((s) => ({ ...s, reader_email: profiles[s.user_id] ?? null }));
}

export async function updateSuggestionStatus(
  id: string,
  status: Suggestion["status"],
  note?: string,
) {
  const { error } = await supabase
    .from("book_suggestions")
    .update({ status, admin_note: note ?? null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function createNotifyRequest(bookId: string, libraryId: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_notify_request", {
    _book_id: bookId,
    _library_id: libraryId,
  });
  if (error) throw error;
  return data as string;
}

export async function getMyNotifyRequest(
  bookId: string,
  userId: string,
): Promise<NotifyRequest | null> {
  const { data, error } = await supabase
    .from("notify_requests")
    .select("*")
    .eq("book_id", bookId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function cancelNotifyRequest(id: string) {
  const { error } = await supabase
    .from("notify_requests")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error) throw error;
}
