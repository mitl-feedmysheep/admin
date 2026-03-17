import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { randomUUID } from "crypto";
import { withLogging } from "@/lib/api-logger";

export const GET = withLogging(async (request: NextRequest) => {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const churchId = searchParams.get("churchId") || session.churchId;
  const isSuperAdmin = session.role === "SUPER_ADMIN";

  try {
    // SUPER_ADMIN: 모든 부서, ADMIN: 내가 소속된 부서만
    const departmentFilter: Record<string, unknown> = {
      church_id: churchId,
      deleted_at: null,
    };

    if (!isSuperAdmin && session.departmentId) {
      // 소속 부서 목록 조회
      const myDeptMembers = await prisma.department_member.findMany({
        where: {
          member_id: session.memberId,
          deleted_at: null,
          department: { church_id: churchId, deleted_at: null },
        },
        select: { department_id: true },
      });
      const myDeptIds = myDeptMembers.map((dm) => dm.department_id);
      departmentFilter.id = { in: myDeptIds.length > 0 ? myDeptIds : ["__none__"] };
    }

    const departments = await prisma.department.findMany({
      where: departmentFilter,
      include: {
        department_members: {
          where: { deleted_at: null },
          select: { id: true },
        },
        groups: {
          where: { deleted_at: null },
          select: { id: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const data = departments.map((dept) => ({
      id: dept.id,
      churchId: dept.church_id,
      name: dept.name,
      description: dept.description,
      isDefault: dept.is_default,
      memberCount: dept.department_members.length,
      groupCount: dept.groups.length,
      createdAt: dept.created_at.toISOString(),
    }));

    return NextResponse.json({ success: true, data: { departments: data, isSuperAdmin } });
  } catch (error) {
    console.error("Failed to fetch departments:", error);
    return NextResponse.json(
      { error: "부서 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
});

export const POST = withLogging(async (request: NextRequest) => {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const churchId = guard.session.churchId;

  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "부서 이름을 입력해주세요." },
        { status: 400 },
      );
    }

    const existing = await prisma.department.findFirst({
      where: {
        church_id: churchId,
        name: name.trim(),
        deleted_at: null,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "같은 이름의 부서가 이미 존재합니다." },
        { status: 409 },
      );
    }

    const departmentId = randomUUID();

    await prisma.$transaction([
      prisma.department.create({
        data: {
          id: departmentId,
          church_id: churchId,
          name: name.trim(),
          description: description?.trim() || null,
        },
      }),
      prisma.activity_log.create({
        data: {
          id: randomUUID(),
          church_id: churchId,
          actor_id: guard.session.memberId,
          action_type: "CREATE",
          entity_type: "DEPARTMENT",
          entity_id: departmentId,
        },
      }),
    ]);

    return NextResponse.json(
      { success: true, data: { id: departmentId } },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create department:", error);
    return NextResponse.json(
      { error: "부서 생성에 실패했습니다." },
      { status: 500 },
    );
  }
});
