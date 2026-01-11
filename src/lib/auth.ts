import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-in-production"
);

// JWT 만료: 90일
const JWT_EXPIRES_IN = "90d";

export interface JWTPayload {
  memberId: string;
  memberName: string;
  churchId: string;
  churchName: string;
  role: string;
  iat: number;
  exp: number;
}

export interface AdminChurch {
  churchId: string;
  churchName: string;
  role: string;
}

export async function createToken(payload: {
  memberId: string;
  memberName: string;
  churchId: string;
  churchName: string;
  role: string;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  
  if (!token) return null;
  
  return verifyToken(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("admin_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 90 * 24 * 60 * 60, // 90일
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("admin_token");
}
