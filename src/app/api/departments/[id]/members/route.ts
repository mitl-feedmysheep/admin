import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { randomUUID } from "crypto";
import { withLogging } from "@/lib/api-logger";

export const GET = withLogging(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401 },
    );
  }

  const { id: departmentId } = await params;

  try {
    const department = await prisma.department.findFirst({
      where: { id: departmentId, church_id: session.churchId, deleted_at: null },
    });

    if (!department) {
      return NextResponse.json(
        { error: "부서를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // SUPER_ADMIN이 아니면 해당 부서의 ADMIN 이상이어야 함
    if (session.role !== "SUPER_ADMIN") {
      const myDeptMember = await prisma.department_member.findFirst({
        where: {
          department_id: departmentId,
          member_id: session.memberId,
          deleted_at: null,
        },
      });

      if (!myDeptMember || myDeptMember.role !== "ADMIN") {
        return NextResponse.json(
          { error: "부서 관리 권한이 필요합니다." },
          { status: 403 },
        );
      }
    }

    const departmentMembers = await prisma.department_member.findMany({
      where: {
        department_id: departmentId,
        deleted_at: null,
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: [
        { role: "desc" },
        { member: { name: "asc" } },
      ],
    });

    // role을 숫자 우선순위로 정렬 (ADMIN > LEADER > MEMBER)
    const roleOrder: Record<string, number> = { ADMIN: 3, LEADER: 2, MEMBER: 1 };
    const sorted = departmentMembers.sort(
      (a, b) => (roleOrder[b.role] ?? 0) - (roleOrder[a.role] ?? 0)
        || a.member.name.localeCompare(b.member.name, "ko"),
    );

    const data = sorted.map((dm) => ({
      id: dm.id,
      memberId: dm.member_id,
      name: dm.member.name,
      email: dm.member.email,
      phone: dm.member.phone,
      role: dm.role,
      status: dm.status,
      createdAt: dm.created_at.toISOString(),
    }));

    return NextResponse.json({ success: true, data: { members: data } });
  } catch (error) {
    console.error("Failed to fetch department members:", error);
    return NextResponse.json(
      { error: "부서 멤버 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
});

export const POST = withLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const { id: departmentId } = await params;

  try {
    const department = await prisma.department.findFirst({
      where: { id: departmentId, church_id: guard.session.churchId, deleted_at: null },
    });

    if (!department) {
      return NextResponse.json(
        { error: "부서를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { memberId, role } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: "멤버를 선택해주세요." },
        { status: 400 },
      );
    }

    const memberRole = role || "MEMBER";
    if (!["MEMBER", "LEADER", "ADMIN"].includes(memberRole)) {
      return NextResponse.json(
        { error: "유효하지 않은 역할입니다." },
        { status: 400 },
      );
    }

    // 해당 멤버가 같은 교회의 church_member인지 확인
    const churchMember = await prisma.church_member.findFirst({
      where: {
        church_id: guard.session.churchId,
        member_id: memberId,
        deleted_at: null,
      },
    });

    if (!churchMember) {
      return NextResponse.json(
        { error: "해당 교회의 멤버가 아닙니다." },
        { status: 400 },
      );
    }

    // 이미 부서에 소속되어 있는지 확인
    const existingDeptMember = await prisma.department_member.findFirst({
      where: {
        department_id: departmentId,
        member_id: memberId,
        deleted_at: null,
      },
    });

    if (existingDeptMember) {
      return NextResponse.json(
        { error: "이미 해당 부서에 소속된 멤버입니다." },
        { status: 409 },
      );
    }

    const deptMemberId = randomUUID();

    await prisma.$transaction([
      prisma.department_member.create({
        data: {
          id: deptMemberId,
          department_id: departmentId,
          member_id: memberId,
          role: memberRole,
        },
      }),
      prisma.activity_log.create({
        data: {
          id: randomUUID(),
          church_id: guard.session.churchId,
          actor_id: guard.session.memberId,
          action_type: "ADD_MEMBER",
          entity_type: "DEPARTMENT_MEMBER",
          entity_id: deptMemberId,
        },
      }),
    ]);

    return NextResponse.json(
      { success: true, data: { id: deptMemberId } },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to add department member:", error);
    return NextResponse.json(
      { error: "부서 멤버 추가에 실패했습니다." },
      { status: 500 },
    );
  }
});
