import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const LOG_PROXY_URL = process.env.LOG_PROXY_URL || "http://container-log-proxy:3100";
const LOG_PROXY_SECRET = process.env.LOG_PROXY_SECRET || "";

/**
 * GET /api/system/monitoring/logs
 * Query: container (intotheheaven-api | intotheheaven-admin), lines (default 200), since (default 1h)
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.memberId !== process.env.SYSTEM_ADMIN_MEMBER_ID) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const container = searchParams.get("container");
  const lines = searchParams.get("lines") || "200";
  const since = searchParams.get("since") || "1h";

  if (!container) {
    return NextResponse.json(
      { error: "container 파라미터가 필요합니다." },
      { status: 400 }
    );
  }

  try {
    const proxyUrl = `${LOG_PROXY_URL}/logs/${container}?lines=${lines}&since=${since}`;
    const headers: Record<string, string> = {};
    if (LOG_PROXY_SECRET) {
      headers["X-Log-Secret"] = LOG_PROXY_SECRET;
    }

    const res = await fetch(proxyUrl, { headers, signal: AbortSignal.timeout(10000) });
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || "로그 조회 실패" },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Log proxy request failed:", error);
    return NextResponse.json(
      { error: "로그 프록시 서버에 연결할 수 없습니다." },
      { status: 502 }
    );
  }
}
