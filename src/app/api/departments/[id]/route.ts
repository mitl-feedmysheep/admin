import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { randomUUID } from "crypto";
import { withLogging } from "@/lib/api-logger";

export const PATCH = withLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;

  try {
    const department = await prisma.department.findFirst({
      where: { id, church_id: guard.session.churchId, deleted_at: null },
    });

    if (!department) {
      return NextResponse.json(
        { error: "부서를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { name, description } = body;

    if (name !== undefined && (!name || !name.trim())) {
      return NextResponse.json(
        { error: "부서 이름을 입력해주세요." },
        { status: 400 },
      );
    }

    if (name && name.trim() !== department.name) {
      const duplicate = await prisma.department.findFirst({
        where: {
          church_id: guard.session.churchId,
          name: name.trim(),
          deleted_at: null,
          id: { not: id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "같은 이름의 부서가 이미 존재합니다." },
          { status: 409 },
        );
      }
    }

    const updateData: Record<string, unknown> = { updated_at: new Date() };
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;

    await prisma.department.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update department:", error);
    return NextResponse.json(
      { error: "부서 수정에 실패했습니다." },
      { status: 500 },
    );
  }
});

export const DELETE = withLogging(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;

  try {
    const department = await prisma.department.findFirst({
      where: { id, church_id: guard.session.churchId, deleted_at: null },
    });

    if (!department) {
      return NextResponse.json(
        { error: "부서를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (department.is_default) {
      return NextResponse.json(
        { error: "기본 부서는 삭제할 수 없습니다." },
        { status: 400 },
      );
    }

    const activeMembers = await prisma.department_member.count({
      where: { department_id: id, deleted_at: null },
    });

    if (activeMembers > 0) {
      return NextResponse.json(
        { error: "소속 멤버가 있는 부서는 삭제할 수 없습니다. 먼저 멤버를 제거해주세요." },
        { status: 400 },
      );
    }

    const activeGroups = await prisma.group.count({
      where: { department_id: id, deleted_at: null },
    });

    if (activeGroups > 0) {
      return NextResponse.json(
        { error: "소속 소그룹이 있는 부서는 삭제할 수 없습니다. 먼저 소그룹을 제거해주세요." },
        { status: 400 },
      );
    }

    const now = new Date();

    await prisma.$transaction([
      prisma.department.update({
        where: { id },
        data: { deleted_at: now },
      }),
      prisma.activity_log.create({
        data: {
          id: randomUUID(),
          church_id: guard.session.churchId,
          actor_id: guard.session.memberId,
          action_type: "DELETE",
          entity_type: "DEPARTMENT",
          entity_id: id,
        },
      }),
    ]);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete department:", error);
    return NextResponse.json(
      { error: "부서 삭제에 실패했습니다." },
      { status: 500 },
    );
  }
});
