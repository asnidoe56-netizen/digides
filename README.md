# DigiDes — Platform PPOB BUMDes

Next.js + TypeScript + PostgreSQL lokal, tanpa ORM. Lihat PRD untuk detail arsitektur lengkap.

## Menjalankan secara lokal

1. Salin `.env.example` menjadi `.env` dan sesuaikan `DATABASE_URL` dengan PostgreSQL lokal (Laragon).
2. Install dependency:

   ```bash
   npm install
   ```

3. Jalankan development server:

   ```bash
   npm run dev
   ```

4. Cek kesehatan aplikasi dan koneksi database di [http://localhost:3000/api/health](http://localhost:3000/api/health).

## Build production

```bash
npm run build
npm run start
```

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Zod · React Hook Form · node-postgres (`pg`) · PostgreSQL.
