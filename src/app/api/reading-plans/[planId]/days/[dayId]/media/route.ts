import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withLogging } from "@/lib/api-logger";
import { requireDepartmentLeader } from "@/lib/require-department-leader";
import { randomUUID } from "crypto";

export const GET = withLogging(async (
  _request: NextRequest,
  { params }: { params: Promise<{ planId: string; dayId: string }> }
) => {
  const guard = await requireDepartmentLeader();
  if (!guard.ok) return guard.response;

  try {
    const { dayId } = await params;
    const rows = await prisma.$queryRaw<{ id: string; url: string }[]>`
      SELECT id, url FROM media
      WHERE entity_type = 'READING_DAY' AND entity_id = ${dayId} AND deleted_at IS NULL
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
  { params }: { params: Promise<{ planId: string; dayId: string }> }
) => {
  const guard = await requireDepartmentLeader();
  if (!guard.ok) return guard.response;

  try {
    const { dayId } = await params;
    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: "url 필수" }, { status: 400 });

    const id = randomUUID();
    const fileGroupId = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO media (id, media_type, entity_type, entity_id, url, file_group_id, created_at, updated_at)
      VALUES (${id}, 'ORIGINAL', 'READING_DAY', ${dayId}, ${url}, ${fileGroupId}, NOW(), NOW())
    `;

    return NextResponse.json({ success: true, data: { id, url } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }
});

export const DELETE = withLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ planId: string; dayId: string }> }
) => {
  const guard = await requireDepartmentLeader();
  if (!guard.ok) return guard.response;

  try {
    const { dayId } = await params;
    const { mediaId } = await request.json();
    if (!mediaId) return NextResponse.json({ error: "mediaId 필수" }, { status: 400 });

    await prisma.$executeRaw`
      UPDATE media SET deleted_at = NOW() WHERE id = ${mediaId} AND entity_id = ${dayId}
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
});
