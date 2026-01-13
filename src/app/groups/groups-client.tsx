"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, ChevronRight, Users, TrendingUp, TrendingDown } from "lucide-react";

// TODO: 실제 DB 연동
const mockGroups = [
  { id: "1", name: "강소정 셀", leader: "강소정", memberCount: 8, weeklyRate: 62, monthlyRate: 75, trend: "down" },
  { id: "2", name: "강혜정 셀", leader: "강혜정", memberCount: 6, weeklyRate: 83, monthlyRate: 80, trend: "up" },
  { id: "3", name: "김민지 셀", leader: "김민지", memberCount: 7, weeklyRate: 71, monthlyRate: 68, trend: "up" },
  { id: "4", name: "김수지 셀", leader: "김수지", memberCount: 8, weeklyRate: 50, monthlyRate: 60, trend: "down" },
  { id: "5", name: "류희재 셀", leader: "류희재", memberCount: 10, weeklyRate: 80, monthlyRate: 78, trend: "up" },
  { id: "6", name: "박예슬 셀", leader: "박예슬", memberCount: 9, weeklyRate: 78, monthlyRate: 82, trend: "down" },
  { id: "7", name: "배나현 셀", leader: "배나현", memberCount: 7, weeklyRate: 57, monthlyRate: 65, trend: "down" },
  { id: "8", name: "석지원 셀", leader: "석지원", memberCount: 9, weeklyRate: 67, monthlyRate: 70, trend: "down" },
  { id: "9", name: "유미미 셀", leader: "유미미", memberCount: 9, weeklyRate: 67, monthlyRate: 72, trend: "down" },
  { id: "10", name: "최예환 셀", leader: "최예환", memberCount: 8, weeklyRate: 88, monthlyRate: 85, trend: "up" },
  { id: "11", name: "한지은 셀", leader: "한지은", memberCount: 9, weeklyRate: 44, monthlyRate: 55, trend: "down" },
];

// 전체 통계
const overallStats = {
  totalGroups: mockGroups.length,
  totalMembers: mockGroups.reduce((sum, g) => sum + g.memberCount, 0),
  avgWeeklyRate: Math.round(mockGroups.reduce((sum, g) => sum + g.weeklyRate, 0) / mockGroups.length),
  avgMonthlyRate: Math.round(mockGroups.reduce((sum, g) => sum + g.monthlyRate, 0) / mockGroups.length),
};

export function GroupsClient() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGroups = mockGroups.filter(
    (group) =>
      group.name.includes(searchQuery) || group.leader.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          그룹 관리
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          셀 그룹 현황과 출석률을 확인할 수 있습니다
        </p>
      </div>

      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">전체 그룹</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {overallStats.totalGroups}
                </p>
              </div>
              <Users className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">전체 멤버</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {overallStats.totalMembers}
                </p>
              </div>
              <Users className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">주간 평균 참석률</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {overallStats.avgWeeklyRate}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">월간 평균 참석률</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {overallStats.avgMonthlyRate}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">그룹 목록</TabsTrigger>
          <TabsTrigger value="stats">출석 통계</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="그룹명 또는 리더 이름으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Groups Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredGroups.map((group) => (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <Card className="border-slate-200 transition-shadow hover:shadow-md dark:border-slate-800">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg text-slate-900 dark:text-white">
                        {group.name}
                      </CardTitle>
                      <ChevronRight className="h-5 w-5 text-slate-400" />
                    </div>
                    <CardDescription>리더: {group.leader}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {group.memberCount}명
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            group.weeklyRate >= 70
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : group.weeklyRate >= 50
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }
                        >
                          {group.weeklyRate}%
                        </Badge>
                        {group.trend === "up" ? (
                          <TrendingUp className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="stats">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">
                셀별 출석 현황
              </CardTitle>
              <CardDescription>
                주간 및 월간 참석률 비교
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
                        리더
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-slate-500 dark:text-slate-400">
                        인원
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-slate-500 dark:text-slate-400">
                        주간 참석률
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-slate-500 dark:text-slate-400">
                        월간 참석률
                      </th>
                      <th className="px-4 py-3 text-center font-medium text-slate-500 dark:text-slate-400">
                        추세
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockGroups.map((group) => (
                      <tr
                        key={group.id}
                        className="border-b border-slate-100 dark:border-slate-800"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                          {group.name}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {group.leader}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400">
                          {group.memberCount}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            className={
                              group.weeklyRate >= 70
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : group.weeklyRate >= 50
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }
                          >
                            {group.weeklyRate}%
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline">{group.monthlyRate}%</Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {group.trend === "up" ? (
                            <TrendingUp className="mx-auto h-4 w-4 text-emerald-500" />
                          ) : (
                            <TrendingDown className="mx-auto h-4 w-4 text-red-500" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
