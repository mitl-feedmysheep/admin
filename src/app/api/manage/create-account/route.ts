import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

/**
 * POST /api/manage/create-account
 * 새 멤버 계정 생성 및 현재 교회에 편입
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      email,
      password,
      sex,
      birthday,
      phone,
      address,
      job,
      baptized,
      mbti,
      description,
    } = body;

    // 필수 필드 검증
    if (!name || !email || !password || !sex || !birthday || !phone) {
      return NextResponse.json(
        { error: "필수 항목을 모두 입력해주세요." },
        { status: 400 }
      );
    }

    // 이메일 중복 확인
    const existingMember = await prisma.member.findFirst({
      where: {
        email,
        deleted_at: null,
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "이미 사용 중인 이메일입니다." },
        { status: 409 }
      );
    }

    // 비밀번호 해싱 (bcrypt, Spring Security 호환)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 성별 변환 (MALE -> M, FEMALE -> F)
    const sexCode = sex === "MALE" ? "M" : "F";

    // 멤버 생성
    const memberId = randomUUID();
    await prisma.member.create({
      data: {
        id: memberId,
        name,
        email,
        password: hashedPassword,
        sex: sexCode,
        birthday: new Date(birthday),
        phone, // 하이픈 제거된 상태로 전달됨
        address: address || null,
        occupation: job || null,
        baptism_status: baptized || null,
        mbti: mbti || null,
        description: description || null,
        is_provisioned: true,
      },
    });

    // 교회 멤버로 편입 (MEMBER 역할)
    const churchMemberId = randomUUID();
    await prisma.church_member.create({
      data: {
        id: churchMemberId,
        church_id: session.churchId,
        member_id: memberId,
        role: "MEMBER",
      },
    });

    console.log(`Account created: ${name} (${email}) → Church: ${session.churchName}`);

    return NextResponse.json({
      success: true,
      data: {
        memberId,
        name,
        email,
      },
    });
  } catch (error) {
    console.error("Create account error:", error);
    return NextResponse.json(
      { error: "계정 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
