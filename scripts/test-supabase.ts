import "dotenv/config";
import { supabaseAdmin } from "../server/supabase-admin";

async function main() {
  console.log("Testing Supabase connection...");
  console.log("URL:", process.env.SUPABASE_URL);

  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });
  if (error) {
    console.error("FAILED:", error.message);
    process.exit(1);
  }

  console.log("OK — connected to Supabase");
  console.log(`Project has ${data.users.length} user(s) in first page`);
  process.exit(0);
}

main().catch((e) => {
  console.error("UNEXPECTED:", e);
  process.exit(1);
});
