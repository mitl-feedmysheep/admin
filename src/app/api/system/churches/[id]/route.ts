import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { withLogging } from "@/lib/api-logger";

export const PATCH = withLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const session = await getSession();
    if (!session || session.memberId !== process.env.SYSTEM_ADMIN_MEMBER_ID) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { isHidden } = body;

    if (typeof isHidden !== "boolean") {
      return NextResponse.json(
        { error: "isHidden은 boolean이어야 합니다." },
        { status: 400 }
      );
    }

    const church = await prisma.church.findFirst({
      where: { id, deleted_at: null },
    });

    if (!church) {
      return NextResponse.json(
        { error: "교회를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    await prisma.church.update({
      where: { id },
      data: { is_hidden: isHidden, updated_at: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update church visibility error:", error);
    return NextResponse.json(
      { error: "교회 정보 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
});
