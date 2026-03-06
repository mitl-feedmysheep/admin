import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const {
      targetMemberId,
      name,
      email,
      sex,
      birthday,
      phone,
      address,
      occupation,
      baptismStatus,
      mbti,
      description,
    } = body;

    // 필수 필드 검증
    if (!targetMemberId || !name || !email || !sex || !birthday || !phone) {
      return NextResponse.json(
        { error: "필수 항목을 모두 입력해주세요." },
        { status: 400 }
      );
    }

    // 교회 소속 멤버인지 확인
    const churchMember = await prisma.church_member.findFirst({
      where: {
        church_id: session.churchId,
        member_id: targetMemberId,
        deleted_at: null,
      },
    });

    if (!churchMember) {
      return NextResponse.json(
        { error: "해당 교회에 소속된 멤버를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 이메일 중복 체크 (본인 제외)
    const existingEmail = await prisma.member.findFirst({
      where: {
        email,
        deleted_at: null,
        id: { not: targetMemberId },
      },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "이미 사용 중인 이메일입니다." },
        { status: 409 }
      );
    }

    await prisma.member.update({
      where: { id: targetMemberId },
      data: {
        name,
        email,
        sex,
        birthday: new Date(birthday),
        phone,
        address: address || null,
        occupation: occupation || null,
        baptism_status: baptismStatus || null,
        mbti: mbti || null,
        description: description || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update member error:", error);
    return NextResponse.json(
      { error: "멤버 정보 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
