import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * GET /api/members
 * 교회 멤버 검색
 * Query: q (검색어)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const churchId = session.churchId;

    console.log("=== Members Search API ===");
    console.log("churchId:", churchId, "query:", query);

    // 검색어가 없으면 빈 배열 반환
    if (!query) {
      return NextResponse.json({
        success: true,
        data: {
          members: [],
          total: 0,
        },
      });
    }

    // 교회에 속한 멤버 검색 (church_member를 통해)
    const churchMembers = await prisma.church_member.findMany({
      where: {
        church_id: churchId,
        deleted_at: null,
        member: {
          deleted_at: null,
          OR: [
            { name: { contains: query } },
            { email: { contains: query } },
            { phone: { contains: query } },
          ],
        },
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            sex: true,
            birthday: true,
            profile_url: true,
            address: true,
            occupation: true,
            baptism_status: true,
            mbti: true,
            description: true,
          },
        },
      },
      orderBy: {
        member: { name: "asc" },
      },
      take: 50, // 최대 50명
    });

    console.log("Members found:", churchMembers.length);

    // 멤버별 소속 그룹 조회
    const memberIds = churchMembers.map((cm) => cm.member_id);
    const groupMembers = await prisma.group_member.findMany({
      where: {
        member_id: { in: memberIds },
        deleted_at: null,
        group: {
          church_id: churchId,
          deleted_at: null,
        },
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 멤버별 그룹 매핑
    const memberGroupMap: Record<string, { groupId: string; groupName: string; role: string }[]> = {};
    groupMembers.forEach((gm) => {
      if (!memberGroupMap[gm.member_id]) {
        memberGroupMap[gm.member_id] = [];
      }
      memberGroupMap[gm.member_id].push({
        groupId: gm.group.id,
        groupName: gm.group.name,
        role: gm.role,
      });
    });

    // 결과 데이터 생성
    const members = churchMembers.map((cm) => {
      const groups = memberGroupMap[cm.member_id] || [];
      const leaderGroup = groups.find((g) => g.role === "LEADER");
      
      return {
        id: cm.member.id,
        name: cm.member.name,
        email: cm.member.email || "",
        phone: cm.member.phone || "",
        sex: cm.member.sex || "",
        birthday: cm.member.birthday?.toISOString().split("T")[0] || "",
        address: cm.member.address || "",
        occupation: cm.member.occupation || "",
        baptismStatus: cm.member.baptism_status || "",
        mbti: cm.member.mbti || "",
        description: cm.member.description || "",
        profileUrl: cm.member.profile_url || "",
        groups: groups,
        // 대표 그룹 (리더인 그룹 우선, 없으면 첫 번째 그룹)
        primaryGroup: leaderGroup?.groupName || groups[0]?.groupName || "",
        role: leaderGroup ? "LEADER" : (groups.length > 0 ? "MEMBER" : ""),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        members,
        total: members.length,
      },
    });
  } catch (error) {
    console.error("Members search error:", error);
    return NextResponse.json(
      { error: "멤버 검색 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
