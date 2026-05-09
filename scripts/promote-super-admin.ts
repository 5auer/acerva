import "dotenv/config";
import { supabaseAdmin } from "../server/supabase-admin";

const TARGET_EMAIL = process.argv[2] ?? "eng.gabrielsauer@gmail.com";
const TARGET_LIBRARY_SLUG = process.argv[3] ?? "cruz-e-sousa";

async function main() {
  console.log(`Promoting ${TARGET_EMAIL} → super_admin + library admin of ${TARGET_LIBRARY_SLUG}\n`);

  // Find the user (must have signed up via the app first)
  const { data: usersList, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listErr) {
    console.error("Failed to list users:", listErr.message);
    process.exit(1);
  }
  const target = usersList.users.find((u) => u.email === TARGET_EMAIL);
  if (!target) {
    console.error(`User ${TARGET_EMAIL} not found in auth.users.`);
    console.error("Sign up via the app first (https://acerva.app or local /auth), then re-run this.");
    process.exit(1);
  }
  console.log(`Found user id=${target.id}`);

  // Library
  const { data: lib, error: libErr } = await supabaseAdmin
    .from("libraries")
    .select("id")
    .eq("slug", TARGET_LIBRARY_SLUG)
    .single();
  if (libErr || !lib) {
    console.error("Library not found:", libErr?.message);
    process.exit(1);
  }
  console.log(`Found library id=${lib.id}`);

  // 1. Super admin
  const { error: saErr } = await supabaseAdmin
    .from("super_admins")
    .upsert({ user_id: target.id }, { onConflict: "user_id" });
  if (saErr) {
    console.error("Failed to insert super_admin:", saErr.message);
    process.exit(1);
  }
  console.log("✓ super_admin granted");

  // 2. Library admin role
  const { error: roleErr } = await supabaseAdmin
    .from("user_roles")
    .insert({ user_id: target.id, role: "admin", library_id: lib.id });
  if (roleErr && !/duplicate|conflict/i.test(roleErr.message)) {
    console.error("Failed to insert user_roles:", roleErr.message);
    process.exit(1);
  }
  console.log("✓ library admin role granted");

  // 3. Membership verified
  const { error: memErr } = await supabaseAdmin
    .from("library_memberships")
    .upsert(
      {
        library_id: lib.id,
        user_id: target.id,
        verification_status: "verified",
      },
      { onConflict: "library_id,user_id" },
    );
  if (memErr) {
    console.error("Failed to upsert membership:", memErr.message);
    process.exit(1);
  }
  console.log("✓ verified membership in library");

  console.log("\nDone. You should now see the admin panel at /<library_slug>/admin.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
