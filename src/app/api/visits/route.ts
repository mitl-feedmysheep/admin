import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  const churchId = guard.session.churchId;
  const memberId = guard.session.memberId;

  try {
    const churchMember = await prisma.church_member.findFirst({
      where: { church_id: churchId, member_id: memberId, deleted_at: null },
    });

    if (!churchMember) {
      return NextResponse.json(
        { error: "교회 멤버 정보를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const dateFilter: Record<string, Date> = {};
    if (year && month) {
      const y = parseInt(year);
      const m = parseInt(month);
      dateFilter.gte = new Date(y, m - 1, 1);
      dateFilter.lt = new Date(y, m, 1);
    }

    const visits = await prisma.visit.findMany({
      where: {
        church_id: churchId,
        church_member_id: churchMember.id,
        deleted_at: null,
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
      },
      include: {
        visit_member: {
          where: { deleted_at: null },
          include: {
            church_member: {
              include: { member: true },
            },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    const data = visits.map((v) => ({
      id: v.id,
      date: v.date.toISOString().split("T")[0],
      startedAt: v.started_at.toISOString(),
      endedAt: v.ended_at.toISOString(),
      place: v.place,
      expense: v.expense,
      notes: v.notes,
      memberCount: v.visit_member.length,
      members: v.visit_member.map((vm) => ({
        visitMemberId: vm.id,
        name: vm.church_member.member.name,
        memberId: vm.church_member.member.id,
      })),
      createdAt: v.created_at.toISOString(),
    }));

    return NextResponse.json({ success: true, data: { visits: data } });
  } catch (error) {
    console.error("Failed to fetch visits:", error);
    return NextResponse.json(
      { error: "심방 목록을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const churchId = guard.session.churchId;
  const memberId = guard.session.memberId;

  try {
    const body = await request.json();
    const { date, startedAt, endedAt, place, expense, notes } = body;

    if (!date || !startedAt || !endedAt || !place || expense == null) {
      return NextResponse.json(
        { error: "필수 항목을 모두 입력해주세요." },
        { status: 400 },
      );
    }

    const churchMember = await prisma.church_member.findFirst({
      where: {
        church_id: churchId,
        member_id: memberId,
        deleted_at: null,
      },
    });

    if (!churchMember) {
      return NextResponse.json(
        { error: "교회 멤버 정보를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const visit = await prisma.visit.create({
      data: {
        id: randomUUID(),
        church_id: churchId,
        church_member_id: churchMember.id,
        date: new Date(date),
        started_at: new Date(startedAt),
        ended_at: new Date(endedAt),
        place,
        expense: Number(expense),
        notes: notes || null,
      },
    });

    return NextResponse.json(
      { success: true, data: { id: visit.id } },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create visit:", error);
    return NextResponse.json(
      { error: "심방 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
