import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { randomUUID } from "crypto";

/**
 * GET /api/groups?year=2026
 * 교회에 속한 소모임 목록 조회 (연도 필터 지원)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get("year");
    const churchId = session.churchId;

    // 연도 필터 조건: 해당 연도에 활동 중인 소모임
    // start_date <= 연도 말 AND (end_date >= 연도 초 OR end_date IS NULL)
    const yearFilter = yearParam
      ? {
          start_date: { lte: new Date(`${yearParam}-12-31`) },
          OR: [
            { end_date: { gte: new Date(`${yearParam}-01-01`) } },
            { end_date: null },
          ],
        }
      : {};

    // 교회에 속한 활성 소모임 목록 (멤버 수 포함)
    const groups = await prisma.group.findMany({
      where: {
        church_id: churchId,
        deleted_at: null,
        ...yearFilter,
      },
      include: {
        group_members: {
          where: { deleted_at: null },
          include: {
            member: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const data = groups.map((group) => {
      const members = group.group_members;
      const leader = members.find((m) => m.role === "LEADER");

      return {
        id: group.id,
        name: group.name,
        description: group.description || "",
        startDate: group.start_date
          ? group.start_date.toISOString().split("T")[0]
          : null,
        endDate: group.end_date
          ? group.end_date.toISOString().split("T")[0]
          : null,
        memberCount: members.length,
        leaderName: leader?.member.name || "",
        leaderId: leader?.member.id || "",
        createdAt: group.created_at.toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        groups: data,
        total: data.length,
      },
    });
  } catch (error) {
    console.error("Groups list error:", error);
    return NextResponse.json(
      { error: "소모임 목록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/groups
 * 새 소모임 생성 + activity_log 기록
 * Body: { name, description?, startDate?, endDate? }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, startDate, endDate } = body;

    // 필수 필드 검증
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "소모임 이름을 입력해주세요." },
        { status: 400 }
      );
    }

    // 같은 교회에 동일 이름의 활성 소모임이 있는지 확인
    const existing = await prisma.group.findFirst({
      where: {
        church_id: session.churchId,
        name: name.trim(),
        deleted_at: null,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "이미 동일한 이름의 소모임이 존재합니다." },
        { status: 409 }
      );
    }

    const groupId = randomUUID();

    // 트랜잭션: 소모임 생성 + activity_log 기록
    await prisma.$transaction(async (tx) => {
      // 소모임 생성
      await tx.group.create({
        data: {
          id: groupId,
          church_id: session.churchId,
          name: name.trim(),
          description: description?.trim() || null,
          start_date: startDate ? new Date(startDate) : null,
          end_date: endDate ? new Date(endDate) : null,
        },
      });

      // activity_log 기록
      await tx.activity_log.create({
        data: {
          id: randomUUID(),
          church_id: session.churchId,
          actor_id: session.memberId,
          action_type: "CREATE",
          entity_type: "GROUP",
          entity_id: groupId,
        },
      });
    });

    console.log(
      `Group created: "${name}" (${groupId}) by ${session.memberName} in church ${session.churchName}`
    );

    return NextResponse.json({
      success: true,
      data: {
        groupId,
        name: name.trim(),
      },
    });
  } catch (error) {
    console.error("Group create error:", error);
    return NextResponse.json(
      { error: "소모임 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
