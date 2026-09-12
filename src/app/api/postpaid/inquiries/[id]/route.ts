import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { findBillInquiryById } from "@/services/postpaid.service";

// Satu hasil cek tagihan, untuk layar rincian dan struk. Hanya pemiliknya
// yang boleh membacanya: hasil cek tagihan memuat nama dan alamat pelanggan.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;
  const inquiry = await findBillInquiryById(id);
  if (!inquiry || inquiry.user_id !== session.userId) {
    return NextResponse.json({ error: "Hasil cek tagihan tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ inquiry });
}
