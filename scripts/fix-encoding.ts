import "dotenv/config";
import { supabaseAdmin } from "../server/supabase-admin";

async function main() {
  console.log("Fixing UTF-8 encoding on existing rows...\n");

  // Library
  const { error: libErr } = await supabaseAdmin
    .from("libraries")
    .update({
      name: "Biblioteca Pública Municipal Cruz e Sousa",
      description: "A biblioteca pública de Schroeder, no Vale do Itapocu.",
    })
    .eq("slug", "cruz-e-sousa");
  if (libErr) console.error("library:", libErr.message);
  else console.log("✓ library");

  // Categories
  const fixes: Array<[string, string]> = [
    ["historia", "História"],
    ["educacao", "Educação"],
  ];
  for (const [slug, name] of fixes) {
    const { error } = await supabaseAdmin
      .from("categories")
      .update({ name })
      .eq("slug", slug);
    if (error) console.error(`category ${slug}:`, error.message);
    else console.log(`✓ category ${slug}: "${name}"`);
  }

  // Verify
  console.log("\nAfter fix:");
  const { data: lib } = await supabaseAdmin
    .from("libraries")
    .select("name, description")
    .eq("slug", "cruz-e-sousa")
    .maybeSingle();
  console.log("  ", lib?.name);
  console.log("  ", lib?.description);
  const { data: cats } = await supabaseAdmin
    .from("categories")
    .select("name, slug")
    .order("name");
  cats?.forEach((c) => console.log(`   ${c.slug}: "${c.name}"`));
}
main().catch((e) => console.error(e));
