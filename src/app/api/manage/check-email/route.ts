import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * GET /api/manage/check-email?email=...
 * Check if an email is already taken
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const email = request.nextUrl.searchParams.get("email");
    if (!email) {
      return NextResponse.json({ error: "이메일을 입력해주세요." }, { status: 400 });
    }

    const existing = await prisma.member.findFirst({
      where: { email, deleted_at: null },
      select: { id: true },
    });

    return NextResponse.json({ available: !existing });
  } catch (error) {
    console.error("Check email error:", error);
    return NextResponse.json({ error: "확인 중 오류가 발생했습니다." }, { status: 500 });
  }
}
