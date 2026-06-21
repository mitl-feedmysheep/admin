import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withLogging } from "@/lib/api-logger";
import { requireDepartmentLeader } from "@/lib/require-department-leader";

export const DELETE = withLogging(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const guard = await requireDepartmentLeader();
  if (!guard.ok) return guard.response;
  try {
    const { id } = await params;

    await prisma.announcement.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bulletin delete error:", error);
    return NextResponse.json({ error: "주보 삭제 중 오류가 발생했습니다." }, { status: 500 });
  }
});
