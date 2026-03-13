import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { withLogging } from "@/lib/api-logger";

export const DELETE = withLogging(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) => {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const { id: departmentId, memberId } = await params;

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

    const deptMember = await prisma.department_member.findFirst({
      where: {
        department_id: departmentId,
        member_id: memberId,
        deleted_at: null,
      },
    });

    if (!deptMember) {
      return NextResponse.json(
        { error: "해당 부서 멤버를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    await prisma.department_member.update({
      where: { id: deptMember.id },
      data: { deleted_at: new Date() },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to remove department member:", error);
    return NextResponse.json(
      { error: "부서 멤버 제거에 실패했습니다." },
      { status: 500 },
    );
  }
});

export const PATCH = withLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) => {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const { id: departmentId, memberId } = await params;

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

    const deptMember = await prisma.department_member.findFirst({
      where: {
        department_id: departmentId,
        member_id: memberId,
        deleted_at: null,
      },
    });

    if (!deptMember) {
      return NextResponse.json(
        { error: "해당 부서 멤버를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { role, status } = body;

    const validRoles = ["MEMBER", "LEADER", "ADMIN"];
    const validStatuses = ["ACTIVE", "GRADUATED"];

    if (role !== undefined && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: "유효하지 않은 역할입니다. (MEMBER, LEADER, ADMIN)" },
        { status: 400 },
      );
    }

    if (status !== undefined && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "유효하지 않은 상태입니다. (ACTIVE, GRADUATED)" },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = { updated_at: new Date() };
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;

    await prisma.department_member.update({
      where: { id: deptMember.id },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update department member:", error);
    return NextResponse.json(
      { error: "부서 멤버 정보 수정에 실패했습니다." },
      { status: 500 },
    );
  }
});
