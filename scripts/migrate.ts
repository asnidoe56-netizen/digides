// Plain CommonJS script run via `node --env-file=.env --experimental-strip-types
// scripts/migrate.ts` (see package.json "db:migrate"). No import/export —
// `require()` is used throughout so this still runs as CommonJS (the
// package has no "type": "module"); tsconfig's `moduleDetection: "force"`
// is what keeps TypeScript from treating this as a global script that
// would clash with seed.ts's identically-named `main()`.

async function main(): Promise<void> {
  const fs = require("fs");
  const path = require("path");
  const { Pool } = require("pg");

  const migrationsDir = path.join(process.cwd(), "database", "migrations");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  const files: string[] = fs
    .readdirSync(migrationsDir)
    .filter((file: string) => file.endsWith(".sql"))
    .sort();

  const { rows } = await pool.query("SELECT filename FROM schema_migrations");
  const applied = new Set(rows.map((row: { filename: string }) => row.filename));

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip    ${file} (already applied)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`applied ${file}`);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(`FAILED  ${file}`);
      throw error;
    } finally {
      client.release();
    }
  }

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
