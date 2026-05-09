import { supabase } from "@/integrations/supabase/client";

export type Category = { id: string; name: string; slug: string; library_id: string };

export type CategoryWithCount = Category & { book_count: number };

export async function listCategoriesWithCount(libraryId: string): Promise<CategoryWithCount[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, library_id, books(id)")
    .eq("library_id", libraryId)
    .order("name");
  if (error) throw error;
  return (data ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    library_id: c.library_id,
    book_count: c.books?.length ?? 0,
  }));
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createCategory(libraryId: string, name: string): Promise<Category> {
  const slug = slugify(name);
  if (!slug) throw new Error("Nome inválido");
  const { data, error } = await supabase
    .from("categories")
    .insert({ library_id: libraryId, name: name.trim(), slug })
    .select("id, name, slug, library_id")
    .single();
  if (error) throw error;
  return data as Category;
}

export async function updateCategory(id: string, name: string) {
  const slug = slugify(name);
  if (!slug) throw new Error("Nome inválido");
  const { error } = await supabase
    .from("categories")
    .update({ name: name.trim(), slug })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}
