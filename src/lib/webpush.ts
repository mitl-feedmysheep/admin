import webpush from "web-push";
import { prisma } from "@/lib/db";

export type PushPayload = {
  title: string;
  body?: string;
  url: string;
};

let vapidConfigured = false;

// VAPID 키는 최초 발송 시점에 지연 설정한다. 모듈 로드 시점에 설정하면
// 환경변수가 비어있을 때 setVapidDetails가 즉시 throw하여, 이 파일을 import하는
// 라우트 전체(무관한 GET/PATCH 로직 포함)가 죽어버리기 때문이다.
function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;

  const publicKey = process.env.WEBPUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEBPUSH_VAPID_PRIVATE_KEY;
  const subject = process.env.WEBPUSH_VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    console.error("[WebPush] VAPID 환경변수가 설정되지 않아 푸시 발송을 건너뜁니다.");
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

/**
 * memberIds가 구독한 모든 기기로 웹푸시를 발송한다.
 * 구독이 만료/무효(404/410/403)면 push_subscription row를 정리한다.
 * backend의 WebPushAdapter와 동일한 VAPID 키/페이로드 규격을 사용한다.
 */
export async function sendPushToMembers(memberIds: string[], payload: PushPayload): Promise<void> {
  if (memberIds.length === 0) return;
  if (!ensureVapidConfigured()) return;

  const subscriptions = await prisma.push_subscription.findMany({
    where: { member_id: { in: memberIds } },
  });

  const body = JSON.stringify({ title: payload.title, body: payload.body, url: payload.url });

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh ?? "", auth: sub.auth ?? "" },
          },
          body
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410 || statusCode === 403) {
          await prisma.push_subscription.delete({ where: { endpoint: sub.endpoint } }).catch(() => {});
        } else {
          console.error("[WebPush] Failed to send to endpoint:", sub.endpoint, error);
        }
      }
    })
  );
}
