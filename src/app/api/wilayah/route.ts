import { NextResponse } from "next/server";
import { findWilayahChildren } from "@/repositories/wilayah.repository";

// Public and unauthenticated on purpose: this feeds the registration
// form's cascading Provinsi/Kabupaten/Kecamatan/Kelurahan dropdowns, which
// a visitor fills in before they have an account or a session.
// GET /api/wilayah            -> the 38 provinces
// GET /api/wilayah?parent=11  -> regencies/cities directly under Aceh
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parent = searchParams.get("parent");

  if (parent !== null && !/^\d{2}(\.\d{2}){0,2}$/.test(parent)) {
    return NextResponse.json({ error: "Kode wilayah tidak valid" }, { status: 400 });
  }

  const options = await findWilayahChildren(parent);
  return NextResponse.json({ options });
}
