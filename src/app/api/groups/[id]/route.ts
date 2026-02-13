import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { randomUUID } from "crypto";

/**
 * GET /api/groups/[id]
 * 소그룹 상세 (멤버 목록 포함)
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

    const { id } = await params;

    const group = await prisma.group.findFirst({
      where: {
        id,
        church_id: session.churchId,
        deleted_at: null,
      },
      include: {
        group_members: {
          where: { deleted_at: null },
          include: {
            member: {
              select: {
                id: true,
                name: true,
                sex: true,
                phone: true,
                birthday: true,
              },
            },
          },
          orderBy: { created_at: "asc" },
        },
      },
    });

    if (!group) {
      return NextResponse.json(
        { error: "소그룹을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const members = group.group_members.map((gm) => ({
      groupMemberId: gm.id,
      memberId: gm.member.id,
      name: gm.member.name,
      sex: gm.member.sex,
      phone: gm.member.phone,
      birthday: gm.member.birthday?.toISOString().split("T")[0] || "",
      role: gm.role,
    }));

    return NextResponse.json({
      success: true,
      data: { members },
    });
  } catch (error) {
    console.error("Group detail error:", error);
    return NextResponse.json(
      { error: "소그룹 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/groups/[id]/members (→ [id] route에서 처리)
 * 소그룹에 멤버 일괄 할당 + activity_log 기록
 * Body: { memberIds: string[], role: "LEADER" | "SUB_LEADER" | "MEMBER" }
 */
export async function POST(
  request: NextRequest,
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
    const body = await request.json();
    const { memberIds, role } = body as { memberIds: string[]; role: string };

    if (!memberIds || memberIds.length === 0) {
      return NextResponse.json(
        { error: "할당할 멤버를 선택해주세요." },
        { status: 400 }
      );
    }

    const validRoles = ["LEADER", "SUB_LEADER", "MEMBER"];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { error: "유효한 역할을 선택해주세요." },
        { status: 400 }
      );
    }

    // 해당 교회 소속의 활성 그룹인지 확인
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

    // 이미 해당 소그룹에 속한 멤버 확인
    const existingMembers = await prisma.group_member.findMany({
      where: {
        group_id: groupId,
        member_id: { in: memberIds },
        deleted_at: null,
      },
      select: { member_id: true },
    });

    const existingMemberIds = new Set(existingMembers.map((m) => m.member_id));
    const newMemberIds = memberIds.filter((id) => !existingMemberIds.has(id));

    if (newMemberIds.length === 0) {
      return NextResponse.json(
        { error: "선택한 멤버가 이미 모두 해당 소그룹에 속해있습니다." },
        { status: 409 }
      );
    }

    // 트랜잭션: group_member 생성 + activity_log 기록
    await prisma.$transaction(async (tx) => {
      // group_member 일괄 생성
      await tx.group_member.createMany({
        data: newMemberIds.map((memberId) => ({
          id: randomUUID(),
          group_id: groupId,
          member_id: memberId,
          role,
        })),
      });

      // activity_log 기록 (멤버별)
      await tx.activity_log.createMany({
        data: newMemberIds.map((memberId) => ({
          id: randomUUID(),
          church_id: session.churchId,
          actor_id: session.memberId,
          action_type: "CREATE",
          entity_type: "GROUP_MEMBER",
          entity_id: memberId,
        })),
      });
    });

    console.log(
      `Members assigned to group "${group.name}": ${newMemberIds.length} members (role: ${role}) by ${session.memberName}`
    );

    return NextResponse.json({
      success: true,
      data: {
        groupId,
        assignedCount: newMemberIds.length,
        skippedCount: existingMemberIds.size,
      },
    });
  } catch (error) {
    console.error("Member assign error:", error);
    return NextResponse.json(
      { error: "멤버 할당 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/groups/[id]
 * 소그룹 이름 변경 + activity_log 기록
 * Body: { name: string }
 */
export async function PATCH(
  request: NextRequest,
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

    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "소그룹 이름을 입력해주세요." },
        { status: 400 }
      );
    }

    // 해당 교회 소속의 활성 그룹인지 확인
    const group = await prisma.group.findFirst({
      where: {
        id,
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

    // 같은 교회에 동일 이름의 다른 활성 소그룹이 있는지 확인
    const duplicate = await prisma.group.findFirst({
      where: {
        church_id: session.churchId,
        name: name.trim(),
        deleted_at: null,
        NOT: { id },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "이미 동일한 이름의 소그룹이 존재합니다." },
        { status: 409 }
      );
    }

    // 트랜잭션: 이름 변경 + activity_log 기록
    await prisma.$transaction(async (tx) => {
      await tx.group.update({
        where: { id },
        data: { name: name.trim() },
      });

      await tx.activity_log.create({
        data: {
          id: randomUUID(),
          church_id: session.churchId,
          actor_id: session.memberId,
          action_type: "UPDATE",
          entity_type: "GROUP",
          entity_id: id,
        },
      });
    });

    console.log(
      `Group renamed: "${group.name}" → "${name.trim()}" (${id}) by ${session.memberName}`
    );

    return NextResponse.json({
      success: true,
      data: { id, name: name.trim() },
    });
  } catch (error) {
    console.error("Group update error:", error);
    return NextResponse.json(
      { error: "소그룹 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
