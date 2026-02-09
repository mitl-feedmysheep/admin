import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

/**
 * GET /api/members/[id]
 * 멤버 상세 정보 조회
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id: memberId } = await params;
    const churchId = session.churchId;

    // 1. 해당 교회 소속 멤버인지 확인 + 멤버 기본 정보
    const churchMember = await prisma.church_member.findFirst({
      where: {
        church_id: churchId,
        member_id: memberId,
        deleted_at: null,
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
            created_at: true,
          },
        },
      },
    });

    if (!churchMember) {
      return NextResponse.json(
        { error: "해당 교회에 소속된 멤버를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const member = churchMember.member;

    // 2. 소속 그룹 목록
    const groupMembers = await prisma.group_member.findMany({
      where: {
        member_id: memberId,
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

    const groups = groupMembers.map((gm) => ({
      groupId: gm.group.id,
      groupName: gm.group.name,
      role: gm.role,
    }));

    // 3. 기도제목 히스토리 (gathering_member를 통해 모임 날짜도 가져옴)
    const prayers = await prisma.prayer.findMany({
      where: {
        member_id: memberId,
        deleted_at: null,
      },
      include: {
        gathering_member: {
          select: {
            gathering: {
              select: {
                date: true,
                group: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { created_at: "desc" },
      take: 50,
    });

    const prayerList = prayers.map((p) => ({
      id: p.id,
      request: p.prayer_request,
      isAnswered: p.is_answered,
      date: p.gathering_member?.gathering?.date?.toISOString().split("T")[0] || p.created_at.toISOString().split("T")[0],
      groupName: p.gathering_member?.gathering?.group?.name || "",
    }));

    // 4. 대표 그룹 (리더인 그룹 우선)
    const leaderGroup = groups.find((g) => g.role === "LEADER");
    const primaryGroup = leaderGroup?.groupName || groups[0]?.groupName || "";
    const primaryRole = leaderGroup ? "LEADER" : groups.length > 0 ? "MEMBER" : "";

    return NextResponse.json({
      success: true,
      data: {
        id: member.id,
        name: member.name,
        email: member.email || "",
        phone: member.phone || "",
        sex: member.sex || "",
        birthday: member.birthday?.toISOString().split("T")[0] || "",
        profileUrl: member.profile_url || "",
        address: member.address || "",
        occupation: member.occupation || "",
        baptismStatus: member.baptism_status || "",
        mbti: member.mbti || "",
        description: member.description || "",
        createdAt: member.created_at?.toISOString().split("T")[0] || "",
        groups,
        primaryGroup,
        primaryRole,
        prayers: prayerList,
      },
    });
  } catch (error) {
    console.error("Member detail error:", error);
    return NextResponse.json(
      { error: "멤버 상세 정보 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
