import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UsersRound, Calendar, TrendingUp } from "lucide-react";

// TODO: 실제 DB 연동 시 prisma로 데이터 조회
const stats = [
  {
    title: "전체 멤버",
    value: "156",
    description: "등록된 교적부 인원",
    icon: Users,
    trend: "+12",
  },
  {
    title: "활성 그룹",
    value: "14",
    description: "현재 운영중인 셀",
    icon: UsersRound,
    trend: "+2",
  },
  {
    title: "금주 모임",
    value: "12",
    description: "이번 주 생성된 모임",
    icon: Calendar,
    trend: "85%",
  },
  {
    title: "평균 참석률",
    value: "78%",
    description: "최근 4주 평균",
    icon: TrendingUp,
    trend: "+5%",
  },
];

// TODO: 실제 데이터로 교체
const recentGatherings = [
  { group: "강소정 셀", date: "2026-01-04", attendance: "5/8", rate: "62%" },
  { group: "강혜정 셀", date: "2026-01-04", attendance: "5/6", rate: "83%" },
  { group: "김민지 셀", date: "2026-01-04", attendance: "5/7", rate: "71%" },
  { group: "류희재 셀", date: "2026-01-04", attendance: "8/10", rate: "80%" },
  { group: "박예슬 셀", date: "2026-01-04", attendance: "7/9", rate: "78%" },
];

export default function DashboardPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            대시보드
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            IntoTheHeaven 관리자 현황을 한눈에 확인하세요
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="border-slate-200 dark:border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stat.value}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {stat.description}
                </p>
                <p className="mt-1 text-xs text-emerald-600">
                  {stat.trend} 이번 달
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Gatherings */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white">
              최근 모임 현황
            </CardTitle>
            <CardDescription>
              이번 주 셀 모임 출석 현황
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                      그룹
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                      날짜
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                      출석
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                      참석률
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentGatherings.map((gathering, index) => (
                    <tr
                      key={index}
                      className="border-b border-slate-100 dark:border-slate-800"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {gathering.group}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {gathering.date}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {gathering.attendance}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                          {gathering.rate}
                        </span>
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
