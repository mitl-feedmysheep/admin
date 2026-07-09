import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { withLogging } from "@/lib/api-logger";

/**
 * GET /api/manage/check-name-duplicate?name=...
 * 같은 교회(및 부서)에 동명의 회원이 있는지 확인
 */
export const GET = withLogging(async (request: NextRequest) => {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const name = request.nextUrl.searchParams.get("name");
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
    }

    const members = await prisma.member.findMany({
      where: {
        name: name.trim(),
        deleted_at: null,
        church_members: {
          some: {
            church_id: session.churchId,
            deleted_at: null,
          },
        },
        ...(session.departmentId
          ? {
              department_members: {
                some: {
                  department_id: session.departmentId,
                  deleted_at: null,
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        sex: true,
        birthday: true,
        phone: true,
        email: true,
      },
    });

    return NextResponse.json({
      exists: members.length > 0,
      members: members.map((m) => ({
        id: m.id,
        name: m.name,
        sex: m.sex === "M" ? "MALE" : "FEMALE",
        birthday: m.birthday.toISOString().split("T")[0],
        phone: m.phone,
        email: m.email,
      })),
    });
  } catch (error) {
    console.error("Check name duplicate error:", error);
    return NextResponse.json({ error: "확인 중 오류가 발생했습니다." }, { status: 500 });
  }
});
