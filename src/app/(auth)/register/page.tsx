import Link from "next/link";
import { RegisterForm } from "@/features/auth";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Daftar Akun DigiDes</h1>
          <p className="text-sm text-muted-foreground">Buat akun untuk mulai bertransaksi</p>
        </div>

        <RegisterForm />

        <p className="text-center text-sm text-muted-foreground">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Masuk
          </Link>
        </p>
      </div>
    </main>
  );
}
