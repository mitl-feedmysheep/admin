import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { randomUUID } from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const { id: visitId, memberId: visitMemberId } = await params;

  try {
    const visitMember = await prisma.visit_member.findFirst({
      where: { id: visitMemberId, visit_id: visitId, deleted_at: null },
      include: {
        church_member: { select: { member_id: true } },
      },
    });

    if (!visitMember) {
      return NextResponse.json(
        { error: "심방 멤버를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { prayerRequest } = body;

    if (!prayerRequest?.trim()) {
      return NextResponse.json(
        { error: "기도제목을 입력해주세요." },
        { status: 400 },
      );
    }

    const prayer = await prisma.prayer.create({
      data: {
        id: randomUUID(),
        visit_member_id: visitMemberId,
        member_id: visitMember.church_member.member_id,
        prayer_request: prayerRequest.trim(),
        is_answered: false,
      },
    });

    return NextResponse.json(
      { success: true, data: { id: prayer.id } },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create visit prayer:", error);
    return NextResponse.json(
      { error: "기도제목 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
