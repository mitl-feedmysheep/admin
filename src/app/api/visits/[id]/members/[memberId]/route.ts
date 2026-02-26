import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/require-super-admin";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const { id: visitId, memberId: visitMemberId } = await params;

  try {
    const visit = await prisma.visit.findFirst({
      where: { id: visitId, church_id: guard.session.churchId, deleted_at: null },
    });

    if (!visit) {
      return NextResponse.json(
        { error: "심방을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const now = new Date();

    await prisma.$transaction([
      prisma.prayer.updateMany({
        where: { visit_member_id: visitMemberId, deleted_at: null },
        data: { deleted_at: now },
      }),
      prisma.visit_member.update({
        where: { id: visitMemberId },
        data: { deleted_at: now },
      }),
    ]);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to remove visit member:", error);
    return NextResponse.json(
      { error: "멤버 제거에 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const { id: visitId, memberId: visitMemberId } = await params;
  const body = await request.json();
  const { story } = body;

  try {
    const visit = await prisma.visit.findFirst({
      where: { id: visitId, church_id: guard.session.churchId, deleted_at: null },
    });

    if (!visit) {
      return NextResponse.json(
        { error: "심방을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    await prisma.visit_member.update({
      where: { id: visitMemberId },
      data: { story: story ?? null, updated_at: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update visit member:", error);
    return NextResponse.json(
      { error: "멤버 정보 수정에 실패했습니다." },
      { status: 500 },
    );
  }
}
