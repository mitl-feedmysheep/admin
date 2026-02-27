import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.memberId !== process.env.SYSTEM_ADMIN_MEMBER_ID) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const churches = await prisma.church.findMany({
      where: { deleted_at: null },
      select: {
        id: true,
        name: true,
        location: true,
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ churches });
  } catch (error) {
    console.error("List churches error:", error);
    return NextResponse.json(
      { error: "교회 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
