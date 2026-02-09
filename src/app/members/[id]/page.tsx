import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Droplets,
  Brain,
  Users,
  HandHeart,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MemberDetailPage({ params }: PageProps) {
  const { id: memberId } = await params;
  const session = await getSession();

  if (!session) {
    notFound();
  }

  const churchId = session.churchId;

  // 1. 교회 소속 멤버 확인 + 기본 정보
  const churchMember = await prisma.church_member.findFirst({
    where: {
      church_id: churchId,
      member_id: memberId,
      deleted_at: null,
    },
    include: {
      member: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          sex: true,
          birthday: true,
          profile_url: true,
          address: true,
          occupation: true,
          baptism_status: true,
          mbti: true,
          description: true,
          created_at: true,
        },
      },
    },
  });

  if (!churchMember) {
    notFound();
  }

  const member = churchMember.member;

  // 2. 소속 그룹 목록
  const groupMembers = await prisma.group_member.findMany({
    where: {
      member_id: memberId,
      deleted_at: null,
      group: {
        church_id: churchId,
        deleted_at: null,
      },
    },
    include: {
      group: {
        select: { id: true, name: true },
      },
    },
  });

  const groups = groupMembers.map((gm) => ({
    groupId: gm.group.id,
    groupName: gm.group.name,
    role: gm.role,
  }));

  // 3. 기도제목 히스토리
  const prayers = await prisma.prayer.findMany({
    where: {
      member_id: memberId,
      deleted_at: null,
    },
    include: {
      gathering_member: {
        select: {
          gathering: {
            select: {
              date: true,
              group: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { created_at: "desc" },
    take: 50,
  });

  const prayerList = prayers.map((p) => ({
    id: p.id,
    request: p.prayer_request,
    isAnswered: p.is_answered,
    date:
      p.gathering_member?.gathering?.date?.toISOString().split("T")[0] ||
      p.created_at.toISOString().split("T")[0],
    groupName: p.gathering_member?.gathering?.group?.name || "",
  }));

  const formatDate = (d: string) => d.replace(/-/g, ".");

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/members">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                {member.name}
              </h1>
              <span className="text-lg text-slate-400">
                {member.sex === "M" ? "남" : member.sex === "F" ? "여" : ""}
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              멤버 상세 정보
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* 기본 정보 */}
          <Card className="border-slate-200 dark:border-slate-800 lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">
                기본 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow icon={Mail} label="이메일" value={member.email || "-"} />
              <InfoRow icon={Phone} label="전화번호" value={member.phone || "-"} />
              <InfoRow
                icon={Calendar}
                label="생년월일"
                value={
                  member.birthday
                    ? formatDate(member.birthday.toISOString().split("T")[0])
                    : "-"
                }
              />
              <InfoRow icon={MapPin} label="주소" value={member.address || "-"} />
              <InfoRow icon={Briefcase} label="직업" value={member.occupation || "-"} />
              <InfoRow icon={Droplets} label="세례여부" value={member.baptism_status || "-"} />
              <InfoRow icon={Brain} label="MBTI" value={member.mbti || "-"} />

              {/* 소속 그룹 */}
              <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
                  소속 그룹
                </p>
                {groups.length > 0 ? (
                  <div className="space-y-2">
                    {groups.map((g) => (
                      <div key={g.groupId} className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-400" />
                        <span className="font-medium text-slate-900 dark:text-white">
                          {g.groupName}
                        </span>
                        <Badge
                          className={
                            g.role === "LEADER"
                              ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          }
                        >
                          {g.role === "LEADER" ? "리더" : "멤버"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400">소속 그룹 없음</p>
                )}
              </div>

              {/* 특이사항 */}
              {member.description && (
                <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    특이사항
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    {member.description}
                  </p>
                </div>
              )}

              {/* 등록일 */}
              <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  등록일
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  {member.created_at
                    ? formatDate(member.created_at.toISOString().split("T")[0])
                    : "-"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 기도제목 히스토리 */}
          <Card className="border-slate-200 dark:border-slate-800 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <HandHeart className="h-5 w-5 text-purple-500" />
                기도제목 히스토리
              </CardTitle>
              <CardDescription>
                최근 나눈 기도제목 {prayerList.length}개
              </CardDescription>
            </CardHeader>
            <CardContent>
              {prayerList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <HandHeart className="mb-4 h-12 w-12" />
                  <p>기도제목이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {prayerList.map((prayer) => (
                    <div
                      key={prayer.id}
                      className="flex items-start gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            {formatDate(prayer.date)}
                          </span>
                          {prayer.groupName && (
                            <span className="text-xs text-slate-400">
                              {prayer.groupName}
                            </span>
                          )}
                          {prayer.isAnswered && (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              응답됨
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 leading-relaxed text-slate-700 dark:text-slate-200">
                          {prayer.request}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

/* 기본 정보 행 컴포넌트 */
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-slate-700 dark:text-slate-200">{value}</p>
      </div>
    </div>
  );
}
