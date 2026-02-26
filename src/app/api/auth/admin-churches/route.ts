import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { rolesAtOrAbove } from "@/lib/roles";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const adminChurches = await prisma.church_member.findMany({
    where: {
      member_id: session.memberId,
      role: { in: rolesAtOrAbove("ADMIN") },
      deleted_at: null,
    },
    include: { church: true },
  });

  const churches = adminChurches.map((cm) => ({
    churchId: cm.church.id,
    churchName: cm.church.name,
    role: cm.role,
  }));

  return NextResponse.json({ churches });
}

