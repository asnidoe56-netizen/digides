import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { findMyStoreProductByBarcode } from "@/services/store-product.service";

// The scan lookup behind PRD Kasir Pintar §5: the cashier points the
// camera at a barcode, and this decides whether it goes straight into the
// cart or the app offers "Tambah produk baru?".
//
// A query parameter rather than a path segment (`/lookup?barcode=...`
// instead of `/barcode/<code>`) because printed codes are not always tidy
// digits — imported goods and shop-printed labels carry slashes, spaces
// and other characters that a path segment would mangle.
//
// An unknown barcode returns 200 with `product: null`, NOT 404. Scanning
// something the warung doesn't stock yet is the ordinary case this feature
// is built around, not a failure — and a 404 would push every client into
// treating a normal moment as an error.
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const barcode = new URL(request.url).searchParams.get("barcode");
  if (!barcode) {
    return NextResponse.json({ error: "Barcode tidak valid" }, { status: 400 });
  }

  try {
    const product = await findMyStoreProductByBarcode(session.userId, barcode);
    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mencari produk." },
      { status: 400 },
    );
  }
}
