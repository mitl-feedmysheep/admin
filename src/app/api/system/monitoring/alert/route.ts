import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { withLogging } from "@/lib/api-logger";

export const POST = withLogging(async (request: NextRequest) => {
  try {
    const secret = request.headers.get("X-Alert-Secret");
    if (secret !== process.env.ALERT_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { services, detectedAt } = body;

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
      subject: `[IntoTheHeaven] 서비스 장애 감지: ${services}`,
      html: `
        <h2>서비스 장애 알림</h2>
        <p><strong>다운된 서비스:</strong> ${services}</p>
        <p><strong>감지 시각:</strong> ${detectedAt}</p>
        <p>맥미니 서버를 확인해주세요.</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Alert sending failed:", error);
    return NextResponse.json({ error: "알림 발송 실패" }, { status: 500 });
  }
});
