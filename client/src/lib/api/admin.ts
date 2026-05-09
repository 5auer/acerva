import { supabase } from "@/integrations/supabase/client";

export type LibraryUser = {
  id: string;
  name: string | null;
  email: string | null;
  cpf: string | null;
  phone: string | null;
  verification_status: "pending" | "submitted" | "verified" | "rejected";
  is_blocked: boolean;
  is_admin: boolean;
  joined_at: string;
};

export type PendingMembership = {
  user_id: string;
  library_id: string;
  doc_type: string | null;
  doc_number: string | null;
  doc_image_url: string | null;
  doc_submitted_at: string | null;
  rejection_reason: string | null;
  verification_status: "pending" | "submitted" | "verified" | "rejected";
  address: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  address_proof_url: string | null;
  address_proof_submitted_at: string | null;
  profile: { id: string; name: string | null; email: string | null; cpf: string | null; phone: string | null } | null;
};

export async function listLibraryUsers(libraryId: string): Promise<LibraryUser[]> {
  const { data, error } = await supabase.rpc("list_library_users", { _library_id: libraryId });
  if (error) throw error;
  return (data as LibraryUser[]) ?? [];
}

export async function listPendingVerifications(libraryId: string): Promise<PendingMembership[]> {
  const { data, error } = await supabase
    .from("library_memberships")
    .select("*")
    .eq("library_id", libraryId)
    .eq("verification_status", "submitted")
    .order("doc_submitted_at", { ascending: true });
  if (error) throw error;

  const userIds = (data ?? []).map((m) => m.user_id);
  let profiles: Record<string, PendingMembership["profile"]> = {};
  if (userIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, name, email, cpf, phone")
      .in("id", userIds);
    profiles = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
  }
  return (data ?? []).map((m) => ({ ...m, profile: profiles[m.user_id] ?? null })) as PendingMembership[];
}

export async function reviewVerification(input: {
  libraryId: string;
  userId: string;
  approve: boolean;
  reason?: string;
}) {
  const { error } = await supabase.rpc("review_verification", {
    _library_id: input.libraryId,
    _user_id: input.userId,
    _approve: input.approve,
    _reason: input.reason ?? null,
  });
  if (error) throw error;
}

export async function setAdminRole(input: {
  libraryId: string;
  userId: string;
  makeAdmin: boolean;
}) {
  const { error } = await supabase.rpc("set_admin_role", {
    _library_id: input.libraryId,
    _user_id: input.userId,
    _make_admin: input.makeAdmin,
  });
  if (error) throw error;
}

export async function unblockUser(libraryId: string, userId: string) {
  const { error } = await supabase.rpc("unblock_user", {
    _library_id: libraryId,
    _user_id: userId,
  });
  if (error) throw error;
}

export async function findUserByCpf(cpf: string): Promise<{ id: string; name: string | null; email: string | null; cpf: string | null } | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, cpf")
    .eq("cpf", cpf)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}
