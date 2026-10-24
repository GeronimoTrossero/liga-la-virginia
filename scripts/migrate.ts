import "./env";
import fs from "fs";
import path from "path";
import { Client } from "pg";

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("Falta DATABASE_URL (Session pooler URI de Supabase). Alternativa: pegá supabase/schema.sql en el SQL Editor de Supabase.");
    process.exit(1);
  }
  const sql = ["schema.sql", "schema-v2.sql"].map((f) => fs.readFileSync(path.join(process.cwd(), "supabase", f), "utf8")).join("\n");
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log("✅ Schema aplicado");
}
main().catch((e) => { console.error(e); process.exit(1); });
