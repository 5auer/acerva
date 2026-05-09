import { supabase } from "@/integrations/supabase/client";

export async function signUp(input: { email: string; password: string; name?: string }) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { name: input.name ?? null },
    },
  });
  if (error) throw error;
  return data;
}

export async function signIn(input: { email: string; password: string }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function resetPassword(email: string, redirectTo?: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  cpf: string | null;
  phone: string | null;
};

export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, cpf, phone")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function updateMyProfile(
  userId: string,
  patch: Partial<Pick<Profile, "name" | "cpf" | "phone">>,
) {
  const { error } = await supabase
    .from("profiles")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}

export type MembershipStatus = {
  library_id: string;
  user_id: string;
  verification_status: "pending" | "submitted" | "verified" | "rejected";
  rejection_reason: string | null;
  is_blocked: boolean;
  blocked_until: string | null;
  block_reason: string | null;
  doc_type: string | null;
  doc_number: string | null;
  doc_image_url: string | null;
  doc_submitted_at: string | null;
  address: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  address_proof_url: string | null;
  address_proof_submitted_at: string | null;
};

export async function getMyMembership(
  libraryId: string,
  userId: string,
): Promise<MembershipStatus | null> {
  const { data, error } = await supabase
    .from("library_memberships")
    .select("*")
    .eq("library_id", libraryId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export type SubmitVerificationInput = {
  libraryId: string;
  docType: "cnh" | "rg";
  docNumber: string;
  docImageUrl: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  addressProofUrl?: string;
};

export async function submitDocument(input: SubmitVerificationInput) {
  const { error } = await supabase.rpc("submit_document", {
    _library_id: input.libraryId,
    _doc_type: input.docType,
    _doc_number: input.docNumber,
    _doc_image_url: input.docImageUrl,
    _address: input.address ?? null,
    _address_number: input.addressNumber ?? null,
    _address_complement: input.addressComplement ?? null,
    _address_neighborhood: input.addressNeighborhood ?? null,
    _address_city: input.addressCity ?? null,
    _address_state: input.addressState ?? null,
    _address_zip: input.addressZip ?? null,
    _address_proof_url: input.addressProofUrl ?? null,
  });
  if (error) throw error;
}
