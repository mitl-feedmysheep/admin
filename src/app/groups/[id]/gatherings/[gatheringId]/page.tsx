import Link from "next/link";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MapPin, Clock, MessageSquare } from "lucide-react";

// TODO: 실제 DB 연동 - CSV 형태 데이터
const mockGathering = {
  id: "g1",
  groupId: "1",
  groupName: "강소정 셀",
  name: "주일 셀모임",
  date: "2026-01-04",
  startedAt: "13:00",
  endedAt: "14:30",
  place: "본당 3층 소모임실",
  description: "2026년 첫 셀모임",
  leaderComment: "새해 첫 모임이라 활동지를 진행했습니다. 서로의 2026년 기도제목을 나누는 시간을 가졌습니다.",
};

// CSV 형태 데이터: 셀원, 예배여부, 셀모임참석여부, 나눔, 한주목표, 기도제목
const mockGatheringMembers = [
  {
    id: "1",
    name: "강소정",
    worshipAttendance: true,
    gatheringAttendance: true,
    story: "",
    goal: "하루의 시작을 기도로 시작하기",
    prayerRequest: "2026년 첫 셀리더로 셀을 섬기는 만큼 부족함이 있을지라도 자책하거나 주눅들지않고 긍정의 힘으로 나아가는 셀리더 될 수 있도록",
  },
  {
    id: "2",
    name: "변재욱",
    worshipAttendance: false,
    gatheringAttendance: false,
    story: "",
    goal: "",
    prayerRequest: "",
  },
  {
    id: "3",
    name: "서현제",
    worshipAttendance: true,
    gatheringAttendance: true,
    story: "",
    goal: "",
    prayerRequest: "",
  },
  {
    id: "4",
    name: "안혜인",
    worshipAttendance: true,
    gatheringAttendance: true,
    story: "",
    goal: "",
    prayerRequest: "",
  },
  {
    id: "5",
    name: "이민주",
    worshipAttendance: true,
    gatheringAttendance: true,
    story: "",
    goal: "",
    prayerRequest: "",
  },
  {
    id: "6",
    name: "정지환",
    worshipAttendance: false,
    gatheringAttendance: false,
    story: "",
    goal: "",
    prayerRequest: "",
  },
  {
    id: "7",
    name: "조정빈",
    worshipAttendance: true,
    gatheringAttendance: true,
    story: "",
    goal: "",
    prayerRequest: "",
  },
  {
    id: "8",
    name: "최고은",
    worshipAttendance: false,
    gatheringAttendance: false,
    story: "",
    goal: "",
    prayerRequest: "",
  },
];

interface PageProps {
  params: Promise<{ id: string; gatheringId: string }>;
}

export default async function GatheringDetailPage({ params }: PageProps) {
  const { id, gatheringId } = await params;
  console.log("Group ID:", id, "Gathering ID:", gatheringId);
  
  const gathering = mockGathering;
  const members = mockGatheringMembers;

  const worshipCount = members.filter((m) => m.worshipAttendance).length;
  const gatheringCount = members.filter((m) => m.gatheringAttendance).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={`/groups/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                {gathering.name}
              </h1>
              <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                {gathering.groupName}
              </Badge>
            </div>
            <div className="mt-1 flex items-center gap-4 text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {gathering.date}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {gathering.startedAt} - {gathering.endedAt}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {gathering.place}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">예배 출석</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {worshipCount}/{members.length}
                </p>
                <Badge className="mt-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {Math.round((worshipCount / members.length) * 100)}%
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">셀모임 참석</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {gatheringCount}/{members.length}
                </p>
                <Badge
                  className={
                    gatheringCount / members.length >= 0.7
                      ? "mt-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "mt-2 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  }
                >
                  {Math.round((gatheringCount / members.length) * 100)}%
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">기도제목</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {members.filter((m) => m.prayerRequest).length}
                </p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  개 나눔
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leader Comment */}
        {gathering.leaderComment && (
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <MessageSquare className="h-5 w-5" />
                리더 코멘트
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 dark:text-slate-300">
                {gathering.leaderComment}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Members Table (CSV 형태) */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white">
              셀원별 기록
            </CardTitle>
            <CardDescription>
              출석, 나눔, 기도제목 상세 현황
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                      셀원
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-slate-500 dark:text-slate-400">
                      예배
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-slate-500 dark:text-slate-400">
                      셀모임
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                      나눔
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                      한주목표
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                      기도제목
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b border-slate-100 dark:border-slate-800"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {member.name}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {member.worshipAttendance ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            O
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            X
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {member.gatheringAttendance ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            O
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            X
                          </Badge>
                        )}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-slate-600 dark:text-slate-300">
                        {member.story || "-"}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-slate-600 dark:text-slate-300">
                        {member.goal || "-"}
                      </td>
                      <td className="max-w-md px-4 py-3 text-slate-600 dark:text-slate-300">
                        {member.prayerRequest ? (
                          <span className="line-clamp-2">{member.prayerRequest}</span>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
