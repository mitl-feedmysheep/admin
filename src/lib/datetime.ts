const KST_TIMEZONE = "Asia/Seoul";
const KST_OFFSET = "+09:00";

/**
 * 날짜/시/분 폼 입력값(KST 기준 벽시계 시각)을 명시적 오프셋이 붙은 ISO 문자열로 변환.
 * `new Date(...)`가 실행 환경(브라우저/서버)의 타임존과 무관하게 정확한 UTC 인스턴트를
 * 계산할 수 있도록, 반드시 이 함수를 거쳐서 서버로 보낼 것.
 */
export function buildKstIso(dateStr: string, hour: string, minute: string): string {
  return `${dateStr}T${hour}:${minute}:00${KST_OFFSET}`;
}

/** 저장된 UTC 인스턴트(ISO 문자열 또는 Date)를 "YYYY.MM.DD HH:mm" KST 벽시계 시각으로 표시 */
export function formatKstDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}.${get("month")}.${get("day")} ${get("hour")}:${get("minute")}`;
}

/** 저장된 UTC 인스턴트를 "YYYY.MM.DD" KST 날짜로 표시 (시간 없이) */
export function formatKstDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .replace(/-/g, ".");
}

/** 저장된 UTC 인스턴트를 "HH:mm" KST 시각으로 표시 */
export function formatKstTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: KST_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/** 서버 프로세스의 로컬 타임존과 무관하게, 지금 이 순간을 KST 기준 "YYYY-MM-DD"로 반환 */
export function todayKstDateString(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: KST_TIMEZONE });
}

/** "YYYY-MM-DD"(KST 기준 날짜)의 자정~다음날 자정을 UTC 인스턴트 범위로 반환. 서버사이드 "오늘" 범위 쿼리에 사용 */
export function kstDayRangeUtc(dateStr: string): { start: Date; end: Date } {
  const start = new Date(`${dateStr}T00:00:00${KST_OFFSET}`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}
