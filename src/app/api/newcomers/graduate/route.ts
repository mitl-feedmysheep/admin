import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { randomUUID } from "crypto";

/**
 * POST /api/newcomers/graduate
 * Graduates a member: set status to GRADUATED, add to target group, increment graduated count
 * Body: { groupId, groupMemberId, targetGroupId }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { groupId, groupMemberId, targetGroupId, gatheringIds } = body as {
      groupId: string;
      groupMemberId: string;
      targetGroupId: string;
      gatheringIds?: string[];
    };

    if (!groupId || !groupMemberId || !targetGroupId) {
      return NextResponse.json(
        { error: "필수 항목이 누락되었습니다." },
        { status: 400 }
      );
    }

    const groupMember = await prisma.group_member.findFirst({
      where: {
        id: groupMemberId,
        group_id: groupId,
        deleted_at: null,
        status: "ACTIVE",
      },
      include: {
        member: { select: { id: true, name: true } },
      },
    });

    if (!groupMember) {
      return NextResponse.json(
        { error: "해당 그룹 멤버를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const program = await prisma.education_program.findFirst({
      where: {
        group_id: groupId,
        deleted_at: null,
      },
    });

    if (!program) {
      return NextResponse.json(
        { error: "교육 프로그램을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const targetGroup = await prisma.group.findFirst({
      where: {
        id: targetGroupId,
        church_id: session.churchId,
        deleted_at: null,
      },
    });

    if (!targetGroup) {
      return NextResponse.json(
        { error: "대상 소그룹을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const alreadyInTarget = await prisma.group_member.findFirst({
      where: {
        group_id: targetGroupId,
        member_id: groupMember.member.id,
        deleted_at: null,
        status: "ACTIVE",
      },
    });

    if (alreadyInTarget) {
      return NextResponse.json(
        { error: "이미 대상 소그룹에 소속되어 있습니다." },
        { status: 409 }
      );
    }

    // 소모임 검증 (gatheringIds가 있을 때만)
    let validGatheringIds: string[] = [];
    if (gatheringIds && gatheringIds.length > 0) {
      const existingGatherings = await prisma.gathering.findMany({
        where: {
          id: { in: gatheringIds },
          group_id: targetGroupId,
          deleted_at: null,
        },
        select: { id: true },
      });
      validGatheringIds = existingGatherings.map((g) => g.id);
    }

    const newGroupMemberId = randomUUID();

    await prisma.$transaction(async (tx) => {
      await tx.group_member.update({
        where: { id: groupMemberId },
        data: { status: "GRADUATED" },
      });

      await tx.group_member.create({
        data: {
          id: newGroupMemberId,
          group_id: targetGroupId,
          member_id: groupMember.member.id,
          role: "MEMBER",
          status: "ACTIVE",
        },
      });

      // 선택된 소모임에 gathering_member 생성
      if (validGatheringIds.length > 0) {
        await tx.gathering_member.createMany({
          data: validGatheringIds.map((gatheringId) => ({
            id: randomUUID(),
            gathering_id: gatheringId,
            group_member_id: newGroupMemberId,
          })),
        });
      }

      await tx.education_program.update({
        where: { id: program.id },
        data: { graduated_count: program.graduated_count + 1 },
      });

      await tx.activity_log.create({
        data: {
          id: randomUUID(),
          church_id: session.churchId,
          actor_id: session.memberId,
          action_type: "UPDATE",
          entity_type: "GROUP_MEMBER",
          entity_id: groupMemberId,
        },
      });
    });

    console.log(
      `Member graduated: "${groupMember.member.name}" from group ${groupId} to ${targetGroupId} by ${session.memberName}`
    );

    return NextResponse.json({
      success: true,
      data: {
        memberName: groupMember.member.name,
        targetGroupName: targetGroup.name,
      },
    });
  } catch (error) {
    console.error("Graduate error:", error);
    return NextResponse.json(
      { error: "졸업 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
