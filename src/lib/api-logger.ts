import { NextRequest, NextResponse } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (...args: any[]) => Promise<NextResponse>;

const KST_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
};

function kstNow(): string {
  return new Date().toLocaleString("sv-SE", KST_OPTIONS).replace(",", "");
}

export function withLogging(handler: RouteHandler): RouteHandler {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (...args: any[]) => {
    const request = args[0] as NextRequest | undefined;
    const start = Date.now();
    const method = request?.method ?? "UNKNOWN";
    const url = request ? new URL(request.url) : null;
    const path = url?.pathname ?? "";
    const query = url?.search ?? "";
    const timestamp = kstNow();

    let response: NextResponse;
    try {
      response = await handler(...args);
    } catch (error) {
      const ms = Date.now() - start;
      console.error(`[${timestamp}] ${method} ${path}${query} → 500 (${ms}ms) [UNHANDLED]`, error);
      throw error;
    }

    const ms = Date.now() - start;
    const status = response.status;
    const msg = `[${timestamp}] ${method} ${path}${query} → ${status} (${ms}ms)`;

    if (status >= 400) {
      console.warn(msg);
    } else {
      console.log(msg);
    }

    return response;
  };
}
