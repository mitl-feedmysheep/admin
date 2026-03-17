import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDepartmentAdmin } from "@/lib/require-department-admin";
import { randomUUID } from "crypto";
import { withLogging } from "@/lib/api-logger";

/**
 * PUT /api/visits/{id}/members/{memberId}/prayers
 * 기도제목 일괄 저장: 기존 수정 + 삭제 + 신규 생성을 한 트랜잭션으로 처리
 * Body: { prayers: { id?: string; prayerRequest: string }[] }
 *   - id가 있으면 기존 기도제목 수정, 없으면 신규 생성
 *   - 기존 기도제목 중 prayers 배열에 포함되지 않은 것은 soft delete
 */
export const PUT = withLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) => {
  const guard = await requireDepartmentAdmin();
  if (!guard.ok) return guard.response;

  const { id: visitId, memberId: visitMemberId } = await params;

  try {
    const visitMember = await prisma.visit_member.findFirst({
      where: { id: visitMemberId, visit_id: visitId, deleted_at: null },
      include: {
        church_member: { select: { member_id: true } },
        prayer: { where: { deleted_at: null }, orderBy: { created_at: "asc" } },
      },
    });

    if (!visitMember) {
      return NextResponse.json(
        { error: "심방 멤버를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { prayers } = body as {
      prayers: { id?: string; prayerRequest: string }[];
    };

    if (!Array.isArray(prayers)) {
      return NextResponse.json(
        { error: "기도제목 목록이 필요합니다." },
        { status: 400 },
      );
    }

    const now = new Date();
    const incomingIds = new Set(prayers.filter((p) => p.id).map((p) => p.id));

    await prisma.$transaction(async (tx) => {
      // 1. 기존 기도제목 중 빠진 것 soft delete
      for (const existing of visitMember.prayer) {
        if (!incomingIds.has(existing.id)) {
          await tx.prayer.update({
            where: { id: existing.id },
            data: { deleted_at: now },
          });
        }
      }

      // 2. 순서대로 처리 (기존 수정 + 신규 생성)
      // DateTime(0)은 초 단위 정밀도이므로 1초 간격으로 created_at 설정
      for (let i = 0; i < prayers.length; i++) {
        const p = prayers[i];
        if (!p.prayerRequest?.trim()) continue;
        const orderTimestamp = new Date(now.getTime() + i * 1000);

        if (p.id) {
          await tx.prayer.update({
            where: { id: p.id },
            data: {
              prayer_request: p.prayerRequest.trim(),
              created_at: orderTimestamp,
              updated_at: now,
            },
          });
        } else {
          await tx.prayer.create({
            data: {
              id: randomUUID(),
              visit_member_id: visitMemberId,
              member_id: visitMember.church_member.member_id,
              prayer_request: p.prayerRequest.trim(),
              is_answered: false,
              created_at: orderTimestamp,
            },
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to bulk save prayers:", error);
    return NextResponse.json(
      { error: "기도제목 저장에 실패했습니다." },
      { status: 500 },
    );
  }
});

export const POST = withLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) => {
  const guard = await requireDepartmentAdmin();
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
});
