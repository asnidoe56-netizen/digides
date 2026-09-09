// Cadangan basis data harian.
//
// Sampai skrip ini ditulis, Digides berjalan di produksi dengan uang
// sungguhan TANPA cadangan sama sekali — tidak ada berkas dump, tidak ada
// cron, dan berkas ini sendiri kosong sejak 29 Agustus. Itu risiko
// terbesar yang ditemukan saat audit kesiapan uji coba sebulan: ledger
// Digides ADALAH uangnya, dan tabel append-only tidak bisa disusun ulang
// dari mana pun kalau hilang.
//
// Sengaja memakai `pg_dump`, bukan menulis SQL sendiri: pg_dump tahu soal
// urutan foreign key, tipe khusus, trigger, dan indeks — hal-hal yang
// justru menentukan apakah pemulihan benar-benar bisa dilakukan, dan yang
// paling gampang salah kalau ditulis tangan.
//
// Dijalankan lewat cron: lihat docs/security/CADANGAN_DATA.md.
//
//   node --env-file=.env --experimental-strip-types scripts/backup.ts
//
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, stat, unlink } from "node:fs/promises";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import path from "node:path";

/** Berapa hari cadangan disimpan sebelum dibuang. */
const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS ?? 14);

const BACKUP_DIR = process.env.BACKUP_DIR ?? "/home/digides/backups";

function timestamp(): string {
  // Waktu lokal server, bukan UTC: nama berkasnya dibaca manusia yang
  // hidup di zona waktu itu, dan "cadangan tanggal 9" harus berarti
  // tanggal 9 menurut orangnya, bukan menurut Greenwich.
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `_${pad(now.getHours())}${pad(now.getMinutes())}`
  );
}

async function pruneOldBackups() {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let removed = 0;
  for (const name of await readdir(BACKUP_DIR)) {
    if (!name.startsWith("digides_") || !name.endsWith(".sql.gz")) continue;
    const full = path.join(BACKUP_DIR, name);
    const info = await stat(full);
    if (info.mtimeMs < cutoff) {
      await unlink(full);
      removed += 1;
    }
  }
  return removed;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL tidak ada di environment");
  }

  await mkdir(BACKUP_DIR, { recursive: true });

  const target = path.join(BACKUP_DIR, `digides_${timestamp()}.sql.gz`);

  // --no-owner/--no-privileges supaya dump-nya bisa dipulihkan ke server
  // lain dengan nama peran yang berbeda — pemulihan yang mensyaratkan
  // peran persis sama adalah pemulihan yang gagal justru pada hari
  // servernya harus diganti.
  const dump = spawn("pg_dump", ["--no-owner", "--no-privileges", databaseUrl], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  dump.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });

  const out = createWriteStream(target);

  try {
    await pipeline(dump.stdout, createGzip(), out);
  } catch (error) {
    // Berkas separuh jadi lebih berbahaya daripada tidak ada berkas: ia
    // terlihat seperti cadangan sampai hari seseorang mencoba memakainya.
    await unlink(target).catch(() => {});
    throw error;
  }

  const code: number = await new Promise((resolve) => dump.on("close", resolve));
  if (code !== 0) {
    await unlink(target).catch(() => {});
    throw new Error(`pg_dump gagal (kode ${code}): ${stderr.trim()}`);
  }

  const info = await stat(target);
  const removed = await pruneOldBackups();

  console.log(
    `[backup] ${path.basename(target)} — ${(info.size / 1024 / 1024).toFixed(2)} MB` +
      (removed > 0 ? `, ${removed} cadangan lama dihapus` : ""),
  );
}

main().catch((error) => {
  console.error("[backup] GAGAL:", error instanceof Error ? error.message : error);
  process.exit(1);
});
