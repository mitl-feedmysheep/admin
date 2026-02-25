import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * GET /api/newcomers?year=2026
 * Retrieves NEWCOMER groups with education programs, members, and progress
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
    const yearParam =
      searchParams.get("year") || new Date().getFullYear().toString();
    const churchId = session.churchId;

    const yearFilter = {
      start_date: { lte: new Date(`${yearParam}-12-31`) },
      OR: [
        { end_date: { gte: new Date(`${yearParam}-01-01`) } },
        { end_date: null },
      ],
    };

    const groups = await prisma.group.findMany({
      where: {
        church_id: churchId,
        type: "NEWCOMER",
        deleted_at: null,
        ...yearFilter,
      },
      include: {
        education_programs: {
          where: { deleted_at: null },
          take: 1,
        },
        group_members: {
          where: { deleted_at: null },
          include: {
            member: {
              select: {
                id: true,
                name: true,
                phone: true,
                birthday: true,
                sex: true,
              },
            },
          },
          orderBy: { created_at: "asc" },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const data = await Promise.all(
      groups.map(async (group) => {
        const program = group.education_programs[0] || null;

        const memberGroupMemberIds = group.group_members.map((gm) => gm.id);
        const progressRecords =
          memberGroupMemberIds.length > 0
            ? await prisma.education_progress.findMany({
                where: {
                  group_member_id: { in: memberGroupMemberIds },
                  deleted_at: null,
                },
                select: {
                  group_member_id: true,
                  week_number: true,
                },
              })
            : [];

        const progressByMember = new Map<string, number[]>();
        for (const p of progressRecords) {
          const weeks = progressByMember.get(p.group_member_id) || [];
          weeks.push(p.week_number);
          progressByMember.set(p.group_member_id, weeks);
        }

        const members = group.group_members.map((gm) => ({
          groupMemberId: gm.id,
          memberId: gm.member.id,
          name: gm.member.name,
          phone: gm.member.phone,
          birthday: gm.member.birthday?.toISOString().split("T")[0] || "",
          sex: gm.member.sex,
          role: gm.role,
          status: gm.status,
          completedWeeks: (progressByMember.get(gm.id) || []).sort(
            (a, b) => a - b
          ),
        }));

        const allNewcomers = members.filter((m) => m.role === "MEMBER");
        const activeMembers = allNewcomers.filter((m) => m.status === "ACTIVE");

        return {
          id: group.id,
          name: group.name,
          program: program
            ? {
                id: program.id,
                name: program.name,
                totalWeeks: program.total_weeks,
                graduatedCount: program.graduated_count,
              }
            : null,
          members,
          totalMembers: allNewcomers.length,
          activeMembers: activeMembers.length,
        };
      })
    );

    const totalNewcomers = data.reduce((sum, g) => sum + g.totalMembers, 0);
    const totalGraduated = data.reduce(
      (sum, g) => sum + (g.program?.graduatedCount || 0),
      0
    );
    const totalInProgress = data.reduce((sum, g) => sum + g.activeMembers, 0);

    return NextResponse.json({
      success: true,
      data: {
        groups: data,
        summary: {
          totalNewcomers,
          totalGraduated,
          totalInProgress,
        },
      },
    });
  } catch (error) {
    console.error("Newcomers list error:", error);
    return NextResponse.json(
      { error: "새가족 현황 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
