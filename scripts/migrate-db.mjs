import postgres from "postgres";
import { readFile } from "node:fs/promises";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1, prepare: false });
try {
  await sql.begin(async (tx) => {
    await tx`CREATE TABLE IF NOT EXISTS app_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
    for (const name of ["render-inicial", "render-community"]) {
      const applied = await tx`SELECT name FROM app_migrations WHERE name = ${name}`;
      if (applied.length) continue;
      await tx.unsafe(await readFile(new URL(`../drizzle/${name}.sql`, import.meta.url), "utf8"));
      await tx`INSERT INTO app_migrations (name) VALUES (${name})`;
    }
  });
  console.log("Database migrations applied successfully.");
} finally {
  await sql.end();
}
