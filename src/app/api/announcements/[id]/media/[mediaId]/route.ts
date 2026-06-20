import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withLogging } from "@/lib/api-logger";
import { requireDepartmentLeader } from "@/lib/require-department-leader";

export const DELETE = withLogging(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; mediaId: string }> }
) => {
  const guard = await requireDepartmentLeader();
  if (!guard.ok) return guard.response;

  try {
    const { id, mediaId } = await params;
    await prisma.$executeRaw`
      UPDATE media SET deleted_at = NOW()
      WHERE id = ${mediaId} AND entity_type = 'ANNOUNCEMENT' AND entity_id = ${id} AND deleted_at IS NULL
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
});
