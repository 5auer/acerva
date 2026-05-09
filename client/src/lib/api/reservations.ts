import { supabase } from "@/integrations/supabase/client";

export type Reservation = {
  id: string;
  library_id: string;
  user_id: string;
  book_id: string;
  copy_id: string | null;
  status: "pending" | "fulfilled" | "cancelled" | "expired";
  reserved_at: string;
  expires_at: string;
  fulfilled_at: string | null;
  cancelled_at: string | null;
};

export type ReservationWithBook = Reservation & {
  book: { id: string; title: string; author: string; cover_url: string | null } | null;
  reader_name?: string | null;
  reader_email?: string | null;
};

export async function createReservation(bookId: string, libraryId: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_reservation", {
    _book_id: bookId,
    _library_id: libraryId,
  });
  if (error) throw error;
  return data as string;
}

export async function cancelReservation(reservationId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_reservation", {
    _reservation_id: reservationId,
  });
  if (error) throw error;
}

export async function fulfillReservation(reservationId: string): Promise<string> {
  const { data, error } = await supabase.rpc("fulfill_reservation", {
    _reservation_id: reservationId,
  });
  if (error) throw error;
  return data as string;
}

export async function listMyReservations(
  libraryId: string,
  userId: string,
): Promise<ReservationWithBook[]> {
  const { data, error } = await supabase
    .from("reservations")
    .select("*, book:books(id, title, author, cover_url)")
    .eq("library_id", libraryId)
    .eq("user_id", userId)
    .in("status", ["pending", "fulfilled"])
    .order("reserved_at", { ascending: false });
  if (error) throw error;
  return (data as any) ?? [];
}

export async function listPendingReservations(libraryId: string): Promise<ReservationWithBook[]> {
  const { data, error } = await supabase
    .from("reservations")
    .select("*, book:books(id, title, author, cover_url)")
    .eq("library_id", libraryId)
    .eq("status", "pending")
    .order("reserved_at", { ascending: true });
  if (error) throw error;

  const userIds = Array.from(new Set((data ?? []).map((r: any) => r.user_id)));
  let profiles: Record<string, { name: string | null; email: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, name, email")
      .in("id", userIds);
    profiles = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
  }

  return ((data as any[]) ?? []).map((r) => ({
    ...r,
    reader_name: profiles[r.user_id]?.name ?? null,
    reader_email: profiles[r.user_id]?.email ?? null,
  }));
}
