import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * GET /api/dashboard/gatherings/[id]
 * 특정 모임의 상세 정보 (Sheet에서 표시)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id: gatheringId } = await params;

    console.log("=== Gathering Detail API ===");
    console.log("gatheringId:", gatheringId);

    // 모임 정보 조회 (한번의 쿼리로 모든 관계 데이터 포함)
    const gathering = await prisma.gathering.findUnique({
      where: {
        id: gatheringId,
        deleted_at: null,
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            group_members: {
              where: { deleted_at: null },
              include: {
                member: {
                  select: {
                    id: true,
                    name: true,
                    sex: true,
                    profile_url: true,
                  },
                },
              },
            },
          },
        },
        gathering_members: {
          where: { deleted_at: null },
          include: {
            group_member: {
              include: {
                member: {
                  select: {
                    id: true,
                    name: true,
                    sex: true,
                    birthday: true,
                  },
                },
              },
            },
            prayers: {
              where: { deleted_at: null },
              select: {
                id: true,
                prayer_request: true,
                is_answered: true,
              },
            },
          },
          orderBy: {
            group_member: {
              member: { birthday: "asc" }, // 나이 많은 순 (생년월일 오름차순)
            },
          },
        },
      },
    });
    console.log("Gathering found:", gathering ? { id: gathering.id, groupName: gathering.group?.name } : null);

    if (!gathering) {
      return NextResponse.json({ error: "모임을 찾을 수 없습니다." }, { status: 404 });
    }

    // 2. 멤버별 데이터 정리
    const members = gathering.gathering_members.map((gm) => ({
      id: gm.id,
      memberId: gm.group_member?.member?.id,
      memberName: gm.group_member?.member?.name || "알 수 없음",
      sex: gm.group_member?.member?.sex || "",
      birthday: gm.group_member?.member?.birthday?.toISOString().split("T")[0] || "",
      worshipAttendance: gm.worship_attendance,
      gatheringAttendance: gm.gathering_attendance,
      story: gm.story || "",
      goal: gm.goal || "",
      leaderComment: gm.leader_comment || "",
      prayers: gm.prayers?.map((p) => ({
        id: p.id,
        content: p.prayer_request,
        isAnswered: p.is_answered,
      })) || [],
    }));
    console.log("Members count:", members.length);

    // 3. 출석 통계 계산
    const totalMembers = members.length;
    const worshipAttended = members.filter(m => m.worshipAttendance === true).length;
    const gatheringAttended = members.filter(m => m.gatheringAttendance === true).length;

    return NextResponse.json({
      success: true,
      data: {
        id: gathering.id,
        groupId: gathering.group?.id,
        groupName: gathering.group?.name,
        date: gathering.date?.toISOString().split("T")[0],
        place: gathering.place,
        leaderComment: gathering.leader_comment || "",
        adminComment: gathering.admin_comment || "",
        stats: {
          totalMembers,
          worshipAttended,
          worshipRate: totalMembers > 0 ? Math.round((worshipAttended / totalMembers) * 100) : 0,
          gatheringAttended,
          gatheringRate: totalMembers > 0 ? Math.round((gatheringAttended / totalMembers) * 100) : 0,
        },
        members,
      },
    });
  } catch (error) {
    console.error("Gathering detail error:", error);
    return NextResponse.json(
      { error: "모임 상세 정보 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/dashboard/gatherings/[id]
 * 모임 정보 수정 (목회자 코멘트 등)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id: gatheringId } = await params;
    const body = await request.json();
    const { adminComment } = body;

    // 모임 업데이트
    const updated = await prisma.gathering.update({
      where: {
        id: gatheringId,
        deleted_at: null,
      },
      data: {
        admin_comment: adminComment,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        adminComment: updated.admin_comment,
      },
    });
  } catch (error) {
    console.error("Gathering update error:", error);
    return NextResponse.json(
      { error: "모임 정보 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
