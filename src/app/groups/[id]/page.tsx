import Link from "next/link";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Users, ChevronRight, UserPlus } from "lucide-react";

// TODO: 실제 DB 연동
const mockGroup = {
  id: "1",
  name: "강소정 셀",
  leader: "강소정",
  description: "청년부 1셀",
  startDate: "2024-01-01",
  memberCount: 8,
};

const mockMembers = [
  { id: "1", name: "강소정", role: "LEADER", phone: "010-1234-5678" },
  { id: "2", name: "변재욱", role: "MEMBER", phone: "010-2345-6789" },
  { id: "3", name: "서현제", role: "MEMBER", phone: "010-3456-7890" },
  { id: "4", name: "안혜인", role: "MEMBER", phone: "010-4567-8901" },
  { id: "5", name: "이민주", role: "MEMBER", phone: "010-5678-9012" },
  { id: "6", name: "정지환", role: "MEMBER", phone: "010-6789-0123" },
  { id: "7", name: "조정빈", role: "MEMBER", phone: "010-7890-1234" },
  { id: "8", name: "최고은", role: "MEMBER", phone: "010-8901-2345" },
];

const mockGatherings = [
  { id: "g1", date: "2026-01-04", name: "주일 셀모임", attendance: 5, total: 8, created: true },
  { id: "g2", date: "2025-12-28", name: "주일 셀모임", attendance: 7, total: 8, created: true },
  { id: "g3", date: "2025-12-21", name: "주일 셀모임", attendance: 6, total: 8, created: true },
  { id: "g4", date: "2025-12-14", name: "주일 셀모임", attendance: 8, total: 8, created: true },
];

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GroupDetailPage({ params }: PageProps) {
  const { id } = await params;
  // TODO: params.id로 실제 그룹 조회
  console.log("Group ID:", id);
  const group = mockGroup;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/groups">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {group.name}
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              리더: {group.leader} · {group.description}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Members */}
          <Card className="border-slate-200 dark:border-slate-800 lg:col-span-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-900 dark:text-white">
                  셀원 목록
                </CardTitle>
                <Button size="sm" variant="outline" className="gap-1">
                  <UserPlus className="h-4 w-4" />
                  추가
                </Button>
              </div>
              <CardDescription>
                <Users className="mr-1 inline h-4 w-4" />
                {mockMembers.length}명
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                  >
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {member.name}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {member.phone}
                      </p>
                    </div>
                    <Badge
                      className={
                        member.role === "LEADER"
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }
                    >
                      {member.role === "LEADER" ? "리더" : "멤버"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Gatherings */}
          <Card className="border-slate-200 dark:border-slate-800 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">
                모임 기록
              </CardTitle>
              <CardDescription>
                <Calendar className="mr-1 inline h-4 w-4" />
                최근 모임 내역
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockGatherings.map((gathering) => (
                  <Link
                    key={gathering.id}
                    href={`/groups/${id}/gatherings/${gathering.id}`}
                  >
                    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                          <Calendar className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {gathering.name}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {gathering.date}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium text-slate-900 dark:text-white">
                            {gathering.attendance}/{gathering.total}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            참석
                          </p>
                        </div>
                        <Badge
                          className={
                            gathering.attendance / gathering.total >= 0.7
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : gathering.attendance / gathering.total >= 0.5
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }
                        >
                          {Math.round((gathering.attendance / gathering.total) * 100)}%
                        </Badge>
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
