import postgres from "postgres";
let connection: ReturnType<typeof postgres> | undefined;
export function getDatabase() {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("Database unavailable");
  // Vercel is external to Render: enforce TLS and keep the per-instance pool small.
  return (connection ??= postgres(url, {
    ssl: "require",
    max: 2,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  }));
}
