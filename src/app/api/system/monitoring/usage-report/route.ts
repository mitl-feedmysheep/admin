import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { withLogging } from "@/lib/api-logger";

type UmamiStats = {
  pageviews: number;
  visitors: number;
  visits: number;
  bounces: number;
  totaltime: number;
};

type SiteReport = {
  label: string;
  icon: string;
  stats: UmamiStats;
  prevStats: UmamiStats;
  topPages?: Array<{ x: string; y: number }>;
  devices?: Array<{ x: string; y: number }>;
};

const UMAMI_API_URL = process.env.UMAMI_API_URL;
const UMAMI_API_TOKEN = process.env.UMAMI_API_TOKEN;

function fetchUmami(path: string) {
  return fetch(`${UMAMI_API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${UMAMI_API_TOKEN}`,
      "Content-Type": "application/json",
    },
  }).then((r) => r.json());
}

async function fetchSiteReport(
  label: string,
  icon: string,
  siteId: string | undefined,
  startAt: number,
  endAt: number,
  withDetails: boolean,
): Promise<SiteReport | null> {
  if (!siteId) return null;

  const statsRaw = await fetchUmami(
    `/api/websites/${siteId}/stats?startAt=${startAt}&endAt=${endAt}`,
  );
  const stats: UmamiStats = {
    pageviews: statsRaw.pageviews ?? 0,
    visitors: statsRaw.visitors ?? 0,
    visits: statsRaw.visits ?? 0,
    bounces: statsRaw.bounces ?? 0,
    totaltime: statsRaw.totaltime ?? 0,
  };
  const prevStats: UmamiStats = {
    pageviews: statsRaw.comparison?.pageviews ?? 0,
    visitors: statsRaw.comparison?.visitors ?? 0,
    visits: statsRaw.comparison?.visits ?? 0,
    bounces: statsRaw.comparison?.bounces ?? 0,
    totaltime: statsRaw.comparison?.totaltime ?? 0,
  };

  let topPages: Array<{ x: string; y: number }> | undefined;
  let devices: Array<{ x: string; y: number }> | undefined;
  if (withDetails) {
    [topPages, devices] = await Promise.all([
      fetchUmami(
        `/api/websites/${siteId}/metrics?startAt=${startAt}&endAt=${endAt}&type=path&limit=5`,
      ),
      fetchUmami(`/api/websites/${siteId}/metrics?startAt=${startAt}&endAt=${endAt}&type=device`),
    ]);
  }

  return { label, icon, stats, prevStats, topPages, devices };
}

function seconds(totaltime: number, visits: number): number {
  return visits === 0 ? 0 : Math.round(totaltime / visits);
}

function ratio(bounces: number, visits: number): number {
  return visits === 0 ? 0 : (bounces / visits) * 100;
}

// web-app(src/App.tsx) 라우트 정의 기준 경로 → 화면명 매핑
const PATH_LABELS: Record<string, string> = {
  "/": "홈",
  "/login": "로그인",
  "/select-church": "교회 선택",
  "/signup": "회원가입",
  "/reset-password": "비밀번호 재설정",
  "/request-church": "교회 가입 요청",
  "/pending-approval": "승인 대기",
  "/provision/email": "이메일 인증",
  "/groups": "소그룹 목록",
  "/prayers": "기도제목",
  "/sermon-notes": "설교노트 목록",
  "/sermon-notes/create": "설교노트 작성",
  "/my": "마이페이지",
  "/my/account": "계정 정보",
  "/my/password": "비밀번호 변경",
  "/my/department": "부서 선택",
  "/my/notifications": "알림 설정",
  "/my/report": "리포트 목록",
  "/my/report/new": "리포트 작성",
  "/messages": "메시지",
  "/notifications": "알림",
  "/announcements": "공지사항 목록",
  "/reading": "오늘의 통독",
  "/reading/progress": "통독 진행현황",
};

// 동적 세그먼트(:id)가 포함된 경로 - 더 구체적인 패턴을 먼저 검사
const PATH_PATTERNS: Array<[RegExp, string]> = [
  [/^\/groups\/[^/]+\/manage$/, "소그룹 관리"],
  [/^\/groups\/[^/]+\/create$/, "모임 생성"],
  [/^\/groups\/[^/]+\/gathering\/[^/]+$/, "모임 상세"],
  [/^\/groups\/[^/]+$/, "소그룹 상세"],
  [/^\/sermon-notes\/[^/]+\/edit$/, "설교노트 수정"],
  [/^\/sermon-notes\/[^/]+$/, "설교노트 상세"],
  [/^\/my\/report\/[^/]+$/, "리포트 상세"],
  [/^\/announcements\/[^/]+$/, "공지사항 상세"],
  [/^\/bulletins\/[^/]+$/, "주보 상세"],
];

function describePath(path: string): string {
  const clean = path.split("?")[0];
  const label = PATH_LABELS[clean] ?? PATH_PATTERNS.find(([re]) => re.test(clean))?.[1];
  return label ? `${label} (${clean})` : clean;
}

// ── 이메일 조각 ──────────────────────────────────────────

const COLORS = {
  bg: "#f1f5f9",
  card: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  sub: "#64748b",
  primary: "#4f46e5",
  primarySoft: "#eef2ff",
  up: "#16a34a",
  upBg: "#dcfce7",
  down: "#dc2626",
  downBg: "#fee2e2",
  flat: "#64748b",
  flatBg: "#f1f5f9",
};

function diffBadge(current: number, prev: number): string {
  if (prev === 0 && current === 0) return "";
  if (prev === 0) {
    return `<span style="display:inline-block;font-size:11px;font-weight:700;color:${COLORS.up};background:${COLORS.upBg};border-radius:999px;padding:2px 8px;">NEW</span>`;
  }
  const diff = ((current - prev) / prev) * 100;
  const flat = Math.abs(diff) < 0.1;
  const up = diff > 0;
  const color = flat ? COLORS.flat : up ? COLORS.up : COLORS.down;
  const bg = flat ? COLORS.flatBg : up ? COLORS.upBg : COLORS.downBg;
  const arrow = flat ? "" : up ? "▲ " : "▼ ";
  return `<span style="display:inline-block;font-size:9.5px;font-weight:700;color:${color};background:${bg};border-radius:999px;padding:1px 6px;">${arrow}${Math.abs(diff).toFixed(1)}%</span>`;
}

function statCard(label: string, value: string, badge: string): string {
  return `
    <td width="33.33%" style="padding:3px;" valign="top">
      <div style="background:${COLORS.card};border:1px solid ${COLORS.border};border-radius:8px;padding:9px 6px;text-align:center;">
        <div style="font-size:10px;color:${COLORS.sub};font-weight:600;letter-spacing:.02em;margin-bottom:3px;">${label}</div>
        <div style="font-size:15px;color:${COLORS.text};font-weight:700;line-height:1.2;">${value}</div>
        <div style="margin-top:4px;">${badge || "&nbsp;"}</div>
      </div>
    </td>`;
}

function renderSiteSection(site: SiteReport): string {
  const cards = [
    statCard("방문자수", `${site.stats.visitors}`, diffBadge(site.stats.visitors, site.prevStats.visitors)),
    statCard("페이지뷰", `${site.stats.pageviews}`, diffBadge(site.stats.pageviews, site.prevStats.pageviews)),
    statCard("세션수", `${site.stats.visits}`, diffBadge(site.stats.visits, site.prevStats.visits)),
    statCard(
      "이탈률",
      `${ratio(site.stats.bounces, site.stats.visits).toFixed(1)}%`,
      diffBadge(
        ratio(site.stats.bounces, site.stats.visits),
        ratio(site.prevStats.bounces, site.prevStats.visits),
      ),
    ),
    statCard(
      "평균 체류시간",
      `${seconds(site.stats.totaltime, site.stats.visits)}초`,
      diffBadge(
        seconds(site.stats.totaltime, site.stats.visits),
        seconds(site.prevStats.totaltime, site.prevStats.visits),
      ),
    ),
  ];

  const cardRows = [cards.slice(0, 3), cards.slice(3, 5)]
    .map((row) => `<tr>${row.join("")}</tr>`)
    .join("");

  let extra = "";
  if (site.topPages?.length) {
    const items = site.topPages
      .map(
        (p, i) => `
        <tr>
          <td style="padding:4px 0;color:${COLORS.sub};font-size:11px;width:16px;white-space:nowrap;">${i + 1}</td>
          <td style="padding:4px 4px 4px 0;color:${COLORS.text};font-size:11px;">${describePath(p.x)}</td>
          <td style="padding:4px 0;color:${COLORS.sub};font-size:11px;text-align:right;white-space:nowrap;">${p.y}회</td>
        </tr>`,
      )
      .join("");
    extra += `
      <div style="margin-top:10px;">
        <div style="font-size:11px;font-weight:700;color:${COLORS.text};margin-bottom:3px;">🔥 인기 페이지 Top 5</div>
        <table width="100%" style="border-collapse:collapse;">${items}</table>
      </div>`;
  }
  if (site.devices?.length) {
    const total = site.devices.reduce((sum, d) => sum + d.y, 0) || 1;
    const items = site.devices
      .map((d) => {
        const p = Math.round((d.y / total) * 100);
        return `
        <tr>
          <td style="padding:3px 0;color:${COLORS.text};font-size:11px;width:56px;">${d.x}</td>
          <td style="padding:3px 0;">
            <div style="background:${COLORS.flatBg};border-radius:999px;height:6px;width:100%;">
              <div style="background:${COLORS.primary};border-radius:999px;height:6px;width:${p}%;"></div>
            </div>
          </td>
          <td style="padding:3px 0 3px 6px;color:${COLORS.sub};font-size:10.5px;width:32px;text-align:right;">${p}%</td>
        </tr>`;
      })
      .join("");
    extra += `
      <div style="margin-top:10px;">
        <div style="font-size:11px;font-weight:700;color:${COLORS.text};margin-bottom:3px;">📶 디바이스 비율</div>
        <table width="100%" style="border-collapse:collapse;">${items}</table>
      </div>`;
  }

  return `
    <div style="margin-top:14px;">
      <div style="font-size:12.5px;font-weight:700;color:${COLORS.text};margin-bottom:5px;">${site.icon} ${site.label}</div>
      <table width="100%" style="border-collapse:collapse;">${cardRows}</table>
      ${extra}
    </div>`;
}

export const POST = withLogging(async (request: NextRequest) => {
  try {
    const secret = request.headers.get("X-Alert-Secret");
    if (secret !== process.env.ALERT_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const period: "daily" | "weekly" = body.period;

    const now = new Date();
    const kstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const todayStart = new Date(
      Date.UTC(kstNow.getFullYear(), kstNow.getMonth(), kstNow.getDate()) - 9 * 60 * 60 * 1000,
    );

    let start: Date;
    let end: Date;
    if (period === "daily") {
      end = todayStart;
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    } else {
      end = todayStart;
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const [webApp, admin] = await Promise.all([
      fetchSiteReport(
        "웹앱 (유저)",
        "📱",
        process.env.UMAMI_WEBAPP_WEBSITE_ID,
        start.getTime(),
        end.getTime(),
        true,
      ),
      fetchSiteReport(
        "어드민",
        "🖥️",
        process.env.UMAMI_ADMIN_WEBSITE_ID,
        start.getTime(),
        end.getTime(),
        false,
      ),
    ]);

    const newSignups = await prisma.member.count({
      where: { deleted_at: null, created_at: { gte: start, lt: end } },
    });

    const fmt = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
    const fmtPretty = (d: Date) =>
      d.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", weekday: "short" });
    const dateLabel =
      period === "daily"
        ? fmt(start)
        : `${fmt(start)} ~ ${fmt(new Date(end.getTime() - 1))}`;
    const dateLabelPretty =
      period === "daily"
        ? fmtPretty(start)
        : `${fmtPretty(start)} ~ ${fmtPretty(new Date(end.getTime() - 1))}`;
    const title = period === "daily" ? "일간 사용 리포트" : "주간 사용 리포트";

    const sections = [webApp, admin].filter((s): s is SiteReport => s !== null);

    const html = `
<div style="background:${COLORS.bg};padding:14px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Pretendard,sans-serif;">
  <table role="presentation" width="100%" style="max-width:420px;margin:0 auto;border-collapse:collapse;">
    <tr>
      <td style="background:${COLORS.primary};border-radius:12px 12px 0 0;padding:14px 16px;">
        <div style="color:#ffffff;font-size:10px;font-weight:700;letter-spacing:.04em;opacity:.85;margin-bottom:3px;">INTOTHEHEAVEN</div>
        <div style="color:#ffffff;font-size:16px;font-weight:800;">📊 ${title}</div>
        <div style="color:${COLORS.primarySoft};font-size:11px;margin-top:3px;">${dateLabelPretty}</div>
      </td>
    </tr>
    <tr>
      <td style="background:${COLORS.card};border:1px solid ${COLORS.border};border-top:none;border-radius:0 0 12px 12px;padding:14px 16px 18px;">
        <table width="100%" style="border-collapse:collapse;">
          <tr>
            <td style="background:${COLORS.primarySoft};border-radius:8px;padding:9px 12px;">
              <span style="font-size:11.5px;color:${COLORS.sub};font-weight:600;">👤 신규 가입자수</span>
              <span style="float:right;font-size:13px;color:${COLORS.primary};font-weight:800;">${newSignups}명</span>
            </td>
          </tr>
        </table>
        ${sections.map(renderSiteSection).join("")}
        <div style="margin-top:16px;padding-top:10px;border-top:1px solid ${COLORS.border};font-size:9.5px;color:${COLORS.sub};text-align:center;">
          ${dateLabel} 기준 · IntoTheHeaven 자동 리포트
        </div>
      </td>
    </tr>
  </table>
</div>`;

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.ALERT_EMAIL_USER,
        pass: process.env.ALERT_EMAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.ALERT_EMAIL_USER,
      to: process.env.ALERT_EMAIL_TO,
      subject: `[IntoTheHeaven] ${title}: ${dateLabel}`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Usage report sending failed:", error);
    return NextResponse.json({ error: "리포트 발송 실패" }, { status: 500 });
  }
});
