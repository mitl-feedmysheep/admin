import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { withLogging } from "@/lib/api-logger";

export const POST = withLogging(async () => {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
});
