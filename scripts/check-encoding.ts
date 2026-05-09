import "dotenv/config";
import { supabaseAdmin } from "../server/supabase-admin";

async function main() {
  const { data: lib } = await supabaseAdmin
    .from("libraries")
    .select("name, description")
    .eq("slug", "cruz-e-sousa")
    .maybeSingle();
  console.log("Library name:", lib?.name);
  console.log("Library desc:", lib?.description);

  const { data: cats } = await supabaseAdmin
    .from("categories")
    .select("name, slug")
    .order("name");
  console.log("\nCategories:");
  cats?.forEach((c) => console.log(`  ${c.slug}: "${c.name}"`));
}
main().catch((e) => console.error(e));
