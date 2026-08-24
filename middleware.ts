import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Placeholder — route protection (session/RBAC) lands in the auth phase.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
