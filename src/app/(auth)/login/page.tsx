import Link from "next/link";
import { LoginForm } from "@/features/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const { registered } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Masuk ke DigiDes</h1>
          <p className="text-sm text-muted-foreground">Platform PPOB BUMDes</p>
        </div>

        {registered ? (
          <p className="rounded-md bg-status-success px-3 py-2 text-center text-sm text-status-success-foreground">
            Pendaftaran berhasil. Silakan masuk.
          </p>
        ) : null}

        <LoginForm />

        <p className="text-center text-sm text-muted-foreground">
          Belum punya akun?{" "}
          <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
            Daftar
          </Link>
        </p>
      </div>
    </main>
  );
}
