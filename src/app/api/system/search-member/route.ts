import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.memberId !== process.env.SYSTEM_ADMIN_MEMBER_ID) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.trim();

    if (!email) {
      return NextResponse.json(
        { error: "이메일을 입력해주세요." },
        { status: 400 }
      );
    }

    const member = await prisma.member.findFirst({
      where: {
        email,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: "해당 이메일의 유저를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      member: {
        memberId: member.id,
        name: member.name,
        email: member.email,
      },
    });
  } catch (error) {
    console.error("Search member error:", error);
    return NextResponse.json(
      { error: "멤버 검색 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
