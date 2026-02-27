import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.trim();

    if (!email) {
      return NextResponse.json(
        { error: "이메일을 입력해주세요." },
        { status: 400 }
      );
    }

    // 본인 교회 소속 멤버만 검색
    const churchMember = await prisma.church_member.findFirst({
      where: {
        church_id: session.churchId,
        deleted_at: null,
        member: {
          email,
          deleted_at: null,
        },
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!churchMember) {
      return NextResponse.json(
        { error: "해당 이메일의 교회 소속 유저를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      member: {
        memberId: churchMember.member.id,
        name: churchMember.member.name,
        email: churchMember.member.email,
      },
    });
  } catch (error) {
    console.error("Search church member error:", error);
    return NextResponse.json(
      { error: "멤버 검색 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
