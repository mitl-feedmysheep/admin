import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * GET /api/groups/[id]/gatherings
 * 소그룹의 소모임 목록 조회 (최신순)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const { id: groupId } = await params;

    // 해당 교회 소속의 그룹인지 확인
    const group = await prisma.group.findFirst({
      where: {
        id: groupId,
        church_id: session.churchId,
        deleted_at: null,
      },
    });

    if (!group) {
      return NextResponse.json(
        { error: "소그룹을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const gatherings = await prisma.gathering.findMany({
      where: {
        group_id: groupId,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        date: true,
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        gatherings: gatherings.map((g) => ({
          id: g.id,
          name: g.name,
          date: g.date.toISOString().split("T")[0],
        })),
      },
    });
  } catch (error) {
    console.error("Gatherings fetch error:", error);
    return NextResponse.json(
      { error: "소모임 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
