// Plain CommonJS script run via `node --env-file=.env --experimental-strip-types
// scripts/seed.ts` (see package.json "db:seed"). Seed files are written to
// be idempotent (ON CONFLICT DO NOTHING), so unlike migrations they're
// simply re-run every time in a fixed order rather than tracked as
// "already applied".

async function main(): Promise<void> {
  const fs = require("fs");
  const path = require("path");
  const { Pool } = require("pg");

  const seedsDir = path.join(process.cwd(), "database", "seeds");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const files: string[] = fs
    .readdirSync(seedsDir)
    .filter((file: string) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(seedsDir, file), "utf8");
    await pool.query(sql);
    console.log(`seeded ${file}`);
  }

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
