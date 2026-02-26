import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { randomUUID } from "crypto";

export async function GET(request: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const tab = searchParams.get("tab") || "my";
  const churchId = guard.session.churchId;
  const memberId = guard.session.memberId;
  const filter = searchParams.get("filter") || "all";
  const groupId = searchParams.get("groupId");
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  try {
    if (tab === "my") {
      return await handleMyPrayers(memberId, filter);
    } else if (tab === "group") {
      return await handleGroupPrayers(churchId, filter, groupId, year, month);
    } else if (tab === "visit") {
      return await handleVisitPrayers(churchId, filter, year, month);
    }

    return NextResponse.json({ error: "Invalid tab" }, { status: 400 });
  } catch (error) {
    console.error("Failed to fetch prayers:", error);
    return NextResponse.json(
      { error: "기도제목을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
}

async function handleMyPrayers(memberId: string, filter: string) {
  const where: Record<string, unknown> = {
    member_id: memberId,
    deleted_at: null,
  };

  if (filter === "praying") where.is_answered = false;
  else if (filter === "answered") where.is_answered = true;

  const prayers = await prisma.prayer.findMany({
    where,
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: {
      prayers: prayers.map((p) => ({
        id: p.id,
        prayerRequest: p.prayer_request,
        description: p.description,
        isAnswered: p.is_answered,
        createdAt: p.created_at.toISOString(),
      })),
    },
  });
}

async function handleGroupPrayers(
  churchId: string,
  filter: string,
  groupId: string | null,
  year: string | null,
  month: string | null,
) {
  const prayerWhere: Record<string, unknown> = {
    deleted_at: null,
    gathering_member_id: { not: null },
    visit_member_id: null,
  };

  if (filter === "praying") prayerWhere.is_answered = false;
  else if (filter === "answered") prayerWhere.is_answered = true;

  const gatheringWhere: Record<string, unknown> = {
    deleted_at: null,
    group: {
      church_id: churchId,
      deleted_at: null,
      ...(groupId ? { id: groupId } : {}),
    },
  };

  if (year && month) {
    const y = parseInt(year);
    const m = parseInt(month);
    gatheringWhere.date = {
      gte: new Date(y, m - 1, 1),
      lt: new Date(y, m, 1),
    };
  }

  const gatherings = await prisma.gathering.findMany({
    where: gatheringWhere,
    include: {
      group: { select: { id: true, name: true } },
      gathering_members: {
        where: { deleted_at: null },
        include: {
          group_member: {
            include: { member: { select: { id: true, name: true, birthday: true } } },
          },
          prayers: {
            where: prayerWhere,
            orderBy: { created_at: "desc" },
          },
        },
      },
    },
    orderBy: { date: "desc" },
  });

  const result = gatherings.map((g) => ({
    gatheringId: g.id,
    gatheringName: g.name,
    gatheringDate: g.date.toISOString().split("T")[0],
    groupId: g.group.id,
    groupName: g.group.name,
    members: g.gathering_members.map((gm) => ({
      memberName: gm.group_member.member.name,
      memberRole: gm.group_member.role,
      memberBirthday: gm.group_member.member.birthday.toISOString(),
      prayers: gm.prayers.map((p) => ({
        id: p.id,
        prayerRequest: p.prayer_request,
        description: p.description,
        isAnswered: p.is_answered,
        createdAt: p.created_at.toISOString(),
      })),
    })),
  }));

  return NextResponse.json({ success: true, data: { gatherings: result } });
}

async function handleVisitPrayers(
  churchId: string,
  filter: string,
  year: string | null,
  month: string | null,
) {
  const prayerWhere: Record<string, unknown> = {
    deleted_at: null,
    visit_member_id: { not: null },
  };

  if (filter === "praying") prayerWhere.is_answered = false;
  else if (filter === "answered") prayerWhere.is_answered = true;

  const visitWhere: Record<string, unknown> = {
    church_id: churchId,
    deleted_at: null,
  };

  if (year && month) {
    const y = parseInt(year);
    const m = parseInt(month);
    visitWhere.date = {
      gte: new Date(y, m - 1, 1),
      lt: new Date(y, m, 1),
    };
  }

  const visits = await prisma.visit.findMany({
    where: visitWhere,
    include: {
      visit_member: {
        where: { deleted_at: null },
        include: {
          church_member: {
            include: { member: { select: { id: true, name: true } } },
          },
          prayer: {
            where: prayerWhere,
            orderBy: { created_at: "desc" },
          },
        },
      },
    },
    orderBy: { date: "desc" },
  });

  const result = visits
    .filter((v) => v.visit_member.some((vm) => vm.prayer.length > 0))
    .map((v) => ({
      visitId: v.id,
      visitDate: v.date.toISOString().split("T")[0],
      place: v.place,
      members: v.visit_member
        .filter((vm) => vm.prayer.length > 0)
        .map((vm) => ({
          memberName: vm.church_member.member.name,
          prayers: vm.prayer.map((p) => ({
            id: p.id,
            prayerRequest: p.prayer_request,
            description: p.description,
            isAnswered: p.is_answered,
            createdAt: p.created_at.toISOString(),
          })),
        })),
    }));

  return NextResponse.json({ success: true, data: { visits: result } });
}

export async function POST(request: NextRequest) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const { prayerRequest, description } = body;

    if (!prayerRequest?.trim()) {
      return NextResponse.json(
        { error: "기도제목을 입력해주세요." },
        { status: 400 },
      );
    }

    const prayer = await prisma.prayer.create({
      data: {
        id: randomUUID(),
        member_id: guard.session.memberId,
        prayer_request: prayerRequest.trim(),
        description: description?.trim() || null,
        is_answered: false,
      },
    });

    return NextResponse.json(
      { success: true, data: { id: prayer.id } },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create prayer:", error);
    return NextResponse.json(
      { error: "기도제목 생성에 실패했습니다." },
      { status: 500 },
    );
  }
}
