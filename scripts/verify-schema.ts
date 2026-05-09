import "dotenv/config";
import { supabaseAdmin } from "../server/supabase-admin";

const expectedTables = [
  "libraries",
  "super_admins",
  "profiles",
  "library_memberships",
  "user_roles",
  "categories",
  "books",
  "book_copies",
  "loans",
  "reservations",
  "book_reviews",
  "book_views",
  "book_suggestions",
  "notify_requests",
];

async function main() {
  console.log("=== Verifying schema ===\n");

  let ok = 0;
  let fail = 0;

  // Use real SELECT ... LIMIT 0 (not head:true) — head:true gives false positives
  // with the new sb_secret_* key format on missing tables.
  for (const t of expectedTables) {
    const { error } = await supabaseAdmin.from(t).select("*").limit(0);
    if (error) {
      console.error(`  ✗ table ${t}: ${error.message}`);
      fail++;
    } else {
      console.log(`  ✓ table ${t}`);
      ok++;
    }
  }

  // Cruz e Sousa library
  const { data: lib, error: libErr } = await supabaseAdmin
    .from("libraries")
    .select("id,slug,name")
    .eq("slug", "cruz-e-sousa")
    .maybeSingle();
  if (libErr) {
    console.error(`  ✗ libraries query: ${libErr.message}`);
    fail++;
  } else if (!lib) {
    console.error(`  ✗ Cruz e Sousa library not found`);
    fail++;
  } else {
    console.log(`  ✓ library cruz-e-sousa: ${lib.id}`);
    ok++;
  }

  // Categories seeded
  if (lib) {
    const { data: cats, error: catErr } = await supabaseAdmin
      .from("categories")
      .select("slug")
      .eq("library_id", lib.id);
    if (catErr) {
      console.error(`  ✗ categories query: ${catErr.message}`);
      fail++;
    } else if (!cats || cats.length === 0) {
      console.error(`  ✗ categories not seeded`);
      fail++;
    } else {
      console.log(`  ✓ ${cats.length} categories seeded`);
      ok++;
    }
  }

  console.log(`\n${ok} ok, ${fail} fail`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("UNEXPECTED:", e);
  process.exit(1);
});
