import { supabase } from "@/integrations/supabase/client";

export async function uploadCover(bookId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${bookId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("covers").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type || `image/${ext}`,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("covers").getPublicUrl(path);
  return data.publicUrl;
}

async function uploadToDocuments(prefix: string, userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/${prefix}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("documents").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || `image/${ext}`,
  });
  if (error) throw error;
  const { data: signed } = await supabase.storage
    .from("documents")
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  return signed?.signedUrl ?? path;
}

export async function uploadDocument(userId: string, file: File): Promise<string> {
  return uploadToDocuments("id", userId, file);
}

export async function uploadAddressProof(userId: string, file: File): Promise<string> {
  return uploadToDocuments("addr", userId, file);
}

export async function getSignedDocumentUrl(url: string): Promise<string> {
  // If the value is already a full URL, return as-is. If it's a path, sign it.
  if (url.startsWith("http")) return url;
  const { data } = await supabase.storage
    .from("documents")
    .createSignedUrl(url, 60 * 60);
  return data?.signedUrl ?? url;
}
