import { NextRequest, NextResponse } from "next/server";
import { withLogging } from "@/lib/api-logger";
import { requireDepartmentLeader } from "@/lib/require-department-leader";
import { generatePresignedPutUrl } from "@/lib/r2";
import { randomUUID } from "crypto";

export const POST = withLogging(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const guard = await requireDepartmentLeader();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const { contentType, fileName } = await request.json();
    if (!contentType || !fileName) {
      return NextResponse.json({ error: "contentType, fileName 필수" }, { status: 400 });
    }

    const ext = fileName.split(".").pop()?.toLowerCase() ?? "jpg";
    const objectKey = `announcement/${id}/${randomUUID()}.${ext}`;
    const { uploadUrl, publicUrl } = await generatePresignedPutUrl(objectKey, contentType);

    return NextResponse.json({ success: true, data: { uploadUrl, publicUrl } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "presign 생성 실패" }, { status: 500 });
  }
});
