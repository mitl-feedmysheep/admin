import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { randomUUID } from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const { id: visitId } = await params;
  const body = await request.json();
  const { churchMemberIds } = body as { churchMemberIds: string[] };

  if (!churchMemberIds || churchMemberIds.length === 0) {
    return NextResponse.json(
      { error: "추가할 멤버를 선택해주세요." },
      { status: 400 },
    );
  }

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

    const existingMembers = await prisma.visit_member.findMany({
      where: { visit_id: visitId, deleted_at: null },
      select: { church_member_id: true },
    });
    const existingIds = new Set(existingMembers.map((m) => m.church_member_id));

    const newIds = churchMemberIds.filter((id) => !existingIds.has(id));
    if (newIds.length === 0) {
      return NextResponse.json(
        { error: "모든 멤버가 이미 추가되어 있습니다." },
        { status: 400 },
      );
    }

    await prisma.visit_member.createMany({
      data: newIds.map((cmId) => ({
        id: randomUUID(),
        visit_id: visitId,
        church_member_id: cmId,
      })),
    });

    return NextResponse.json(
      { success: true, data: { addedCount: newIds.length } },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to add visit members:", error);
    return NextResponse.json(
      { error: "멤버 추가에 실패했습니다." },
      { status: 500 },
    );
  }
}
