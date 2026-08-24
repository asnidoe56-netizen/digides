import { NextResponse } from "next/server";
import { query } from "@/lib/db/query";

export async function GET() {
  const body: {
    status: "ok" | "degraded";
    app: "ok";
    database: "connected" | "unreachable";
  } = {
    status: "ok",
    app: "ok",
    database: "connected",
  };

  try {
    await query("SELECT 1");
  } catch {
    body.status = "degraded";
    body.database = "unreachable";
    return NextResponse.json(body, { status: 503 });
  }

  return NextResponse.json(body, { status: 200 });
}
