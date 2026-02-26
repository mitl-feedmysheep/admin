import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/require-super-admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = await request.json();

  try {
    const prayer = await prisma.prayer.findFirst({
      where: { id, deleted_at: null },
    });

    if (!prayer) {
      return NextResponse.json(
        { error: "기도제목을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const updateData: Record<string, unknown> = { updated_at: new Date() };

    if (body.isAnswered !== undefined) {
      updateData.is_answered = body.isAnswered;
    }
    if (body.prayerRequest !== undefined) {
      updateData.prayer_request = body.prayerRequest;
    }
    if (body.description !== undefined) {
      updateData.description = body.description || null;
    }

    await prisma.prayer.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update prayer:", error);
    return NextResponse.json(
      { error: "기도제목 수정에 실패했습니다." },
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
    const prayer = await prisma.prayer.findFirst({
      where: { id, deleted_at: null },
    });

    if (!prayer) {
      return NextResponse.json(
        { error: "기도제목을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    await prisma.prayer.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete prayer:", error);
    return NextResponse.json(
      { error: "기도제목 삭제에 실패했습니다." },
      { status: 500 },
    );
  }
}
