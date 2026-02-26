import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/require-super-admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;

  try {
    const churchMember = await prisma.church_member.findFirst({
      where: { church_id: guard.session.churchId, member_id: guard.session.memberId, deleted_at: null },
    });

    if (!churchMember) {
      return NextResponse.json(
        { error: "교회 멤버 정보를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const visit = await prisma.visit.findFirst({
      where: { id, church_id: guard.session.churchId, church_member_id: churchMember.id, deleted_at: null },
      include: {
        visit_member: {
          where: { deleted_at: null },
          include: {
            church_member: {
              include: { member: true },
            },
            prayer: {
              where: { deleted_at: null },
              orderBy: { created_at: "asc" },
            },
          },
        },
      },
    });

    if (!visit) {
      return NextResponse.json(
        { error: "심방을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const data = {
      id: visit.id,
      date: visit.date.toISOString().split("T")[0],
      startedAt: visit.started_at.toISOString(),
      endedAt: visit.ended_at.toISOString(),
      place: visit.place,
      expense: visit.expense,
      notes: visit.notes,
      visitMembers: visit.visit_member
        .map((vm) => ({
          id: vm.id,
          churchMemberId: vm.church_member_id,
          memberName: vm.church_member.member.name,
          sex: vm.church_member.member.sex,
          birthday: vm.church_member.member.birthday
            .toISOString()
            .split("T")[0],
          story: vm.story,
          prayers: vm.prayer.map((p) => ({
            id: p.id,
            prayerRequest: p.prayer_request,
            description: p.description,
            isAnswered: p.is_answered,
            createdAt: p.created_at.toISOString(),
          })),
        }))
        .sort(
          (a, b) =>
            new Date(a.birthday).getTime() - new Date(b.birthday).getTime(),
        ),
      createdAt: visit.created_at.toISOString(),
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Failed to fetch visit detail:", error);
    return NextResponse.json(
      { error: "심방 상세 정보를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await request.json();
  const { date, startedAt, endedAt, place, expense, notes } = body;

  if (!date || !startedAt || !endedAt || !place || expense == null) {
    return NextResponse.json(
      { error: "필수 항목을 모두 입력해주세요." },
      { status: 400 },
    );
  }

  try {
    const churchMember = await prisma.church_member.findFirst({
      where: { church_id: guard.session.churchId, member_id: guard.session.memberId, deleted_at: null },
    });

    const existing = await prisma.visit.findFirst({
      where: { id, church_id: guard.session.churchId, ...(churchMember ? { church_member_id: churchMember.id } : {}), deleted_at: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "심방을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    await prisma.visit.update({
      where: { id },
      data: {
        date: new Date(date),
        started_at: new Date(startedAt),
        ended_at: new Date(endedAt),
        place,
        expense: Number(expense),
        notes: notes || null,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update visit:", error);
    return NextResponse.json(
      { error: "심방 수정에 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;

  try {
    const churchMember = await prisma.church_member.findFirst({
      where: { church_id: guard.session.churchId, member_id: guard.session.memberId, deleted_at: null },
    });

    const existing = await prisma.visit.findFirst({
      where: { id, church_id: guard.session.churchId, ...(churchMember ? { church_member_id: churchMember.id } : {}), deleted_at: null },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "심방을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const now = new Date();

    await prisma.$transaction([
      prisma.prayer.updateMany({
        where: {
          visit_member: { visit_id: id },
          deleted_at: null,
        },
        data: { deleted_at: now },
      }),
      prisma.visit_member.updateMany({
        where: { visit_id: id, deleted_at: null },
        data: { deleted_at: now },
      }),
      prisma.visit.update({
        where: { id },
        data: { deleted_at: now },
      }),
    ]);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete visit:", error);
    return NextResponse.json(
      { error: "심방 삭제에 실패했습니다." },
      { status: 500 },
    );
  }
}
