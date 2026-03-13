import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import crypto from "crypto";
import { withLogging } from "@/lib/api-logger";

export const POST = withLogging(async (request: NextRequest) => {
  try {
    const session = await getSession();
    if (!session || session.memberId !== process.env.SYSTEM_ADMIN_MEMBER_ID) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await request.json();
    const { name, location, number, homepageUrl, description } = body;

    if (!name?.trim() || !location?.trim()) {
      return NextResponse.json(
        { error: "교회명과 위치는 필수입니다." },
        { status: 400 }
      );
    }

    const churchId = crypto.randomUUID();
    const departmentId = crypto.randomUUID();

    const church = await prisma.$transaction(async (tx) => {
      const created = await tx.church.create({
        data: {
          id: churchId,
          name: name.trim(),
          location: location.trim(),
          number: number?.trim() || null,
          homepage_url: homepageUrl?.trim() || null,
          description: description?.trim() || null,
        },
      });

      await tx.department.create({
        data: {
          id: departmentId,
          church_id: churchId,
          name: "전체",
          is_default: true,
        },
      });

      return created;
    });

    return NextResponse.json({
      church: {
        id: church.id,
        name: church.name,
        location: church.location,
      },
    });
  } catch (error) {
    console.error("Create church error:", error);
    return NextResponse.json(
      { error: "교회 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
});
