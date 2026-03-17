import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { rolesAtOrAbove } from "@/lib/roles";
import { withLogging } from "@/lib/api-logger";

export const GET = withLogging(async () => {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  // church ADMIN+ 인 교회
  const adminChurches = await prisma.church_member.findMany({
    where: {
      member_id: session.memberId,
      role: { in: rolesAtOrAbove("ADMIN") },
      deleted_at: null,
    },
    include: { church: true },
  });

  const churchMap = new Map<string, { churchId: string; churchName: string; role: string }>();
  for (const cm of adminChurches) {
    churchMap.set(cm.church.id, {
      churchId: cm.church.id,
      churchName: cm.church.name,
      role: cm.role,
    });
  }

  // department LEADER+ 인 부서의 교회 추가
  const deptMembers = await prisma.department_member.findMany({
    where: {
      member_id: session.memberId,
      deleted_at: null,
      role: { in: ["LEADER", "ADMIN"] },
    },
    include: {
      department: {
        include: { church: true },
      },
    },
  });

  for (const dm of deptMembers) {
    if (!dm.department) continue;
    const churchId = dm.department.church_id;
    if (!churchMap.has(churchId)) {
      // church_member의 role 조회
      const cm = await prisma.church_member.findFirst({
        where: {
          member_id: session.memberId,
          church_id: churchId,
          deleted_at: null,
        },
      });
      churchMap.set(churchId, {
        churchId,
        churchName: dm.department.church.name,
        role: cm?.role ?? "MEMBER",
      });
    }
  }

  const churches = Array.from(churchMap.values());

  return NextResponse.json({ churches });
});
