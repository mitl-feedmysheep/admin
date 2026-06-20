import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";
import { withLogging } from "@/lib/api-logger";
import { requireDepartmentLeader } from "@/lib/require-department-leader";

export const GET = withLogging(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const guard = await requireDepartmentLeader();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const rows = await prisma.$queryRaw<{ id: string; url: string }[]>`
      SELECT id, url FROM media
      WHERE entity_type = 'ANNOUNCEMENT' AND entity_id = ${id} AND deleted_at IS NULL
      ORDER BY created_at ASC
    `;
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
});

export const POST = withLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const guard = await requireDepartmentLeader();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: "url 필수" }, { status: 400 });

    const mediaId = randomUUID();
    const fileGroupId = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO media (id, media_type, entity_type, entity_id, url, file_group_id, created_at, updated_at)
      VALUES (${mediaId}, 'ORIGINAL', 'ANNOUNCEMENT', ${id}, ${url}, ${fileGroupId}, NOW(), NOW())
    `;

    return NextResponse.json({ success: true, data: { id: mediaId, url } }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }
});
