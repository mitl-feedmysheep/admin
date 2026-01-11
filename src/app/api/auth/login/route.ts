import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/cd8bb888-87b2-49ab-8968-e2ee7e7c002d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/route.ts:11',message:'Login attempt',data:{email,passwordLength:password?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (!email || !password) {
      return NextResponse.json(
        { error: "이메일과 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    // 1. 멤버 조회
    const member = await prisma.member.findFirst({
      where: {
        email,
        deleted_at: null,
      },
    });

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/cd8bb888-87b2-49ab-8968-e2ee7e7c002d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/route.ts:30',message:'Member lookup result',data:{found:!!member,memberId:member?.id,hasPassword:!!member?.password,passwordPrefix:member?.password?.substring(0,10)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (!member) {
      return NextResponse.json(
        { error: "존재하지 않는 계정입니다." },
        { status: 401 }
      );
    }

    // 2. BCrypt 비밀번호 검증 (Spring Security BCryptPasswordEncoder 호환)
    const isPasswordValid = await bcrypt.compare(password, member.password);

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/cd8bb888-87b2-49ab-8968-e2ee7e7c002d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/route.ts:45',message:'Password verification',data:{isPasswordValid,inputPassword:password?.substring(0,3)+'***',storedHashPrefix:member.password?.substring(0,20)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    // 3. ADMIN 권한이 있는 교회 목록 조회
    const adminChurches = await prisma.church_member.findMany({
      where: {
        member_id: member.id,
        role: "ADMIN",
        deleted_at: null,
      },
      include: {
        church: true,
      },
    });

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/cd8bb888-87b2-49ab-8968-e2ee7e7c002d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/route.ts:70',message:'Admin churches lookup',data:{memberId:member.id,adminChurchesCount:adminChurches.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    if (adminChurches.length === 0) {
      return NextResponse.json(
        { error: "관리자 권한이 있는 교회가 없습니다." },
        { status: 403 }
      );
    }

    // 4. 교회 목록 반환 (교회 선택 화면으로 이동)
    const churches = adminChurches.map((cm) => ({
      churchId: cm.church.id,
      churchName: cm.church.name,
      role: cm.role,
    }));

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/cd8bb888-87b2-49ab-8968-e2ee7e7c002d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/route.ts:90',message:'Login success',data:{memberId:member.id,memberName:member.name,churchesCount:churches.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'success'})}).catch(()=>{});
    // #endregion

    return NextResponse.json({
      success: true,
      memberId: member.id,
      memberName: member.name,
      churches,
    });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/cd8bb888-87b2-49ab-8968-e2ee7e7c002d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'login/route.ts:103',message:'Login error',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'error'})}).catch(()=>{});
    // #endregion
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "로그인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
