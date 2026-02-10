"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UsersRound, Church, HandHeart, Download, ChevronRight, ChevronLeft, User, Check, X, AlertCircle, Loader2, BookOpen, Target, Cake } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import * as XLSX from "xlsx";

// API 응답 타입
interface StatsData {
  totalMembers: number;
  activeGroups: number;
  worshipRate: string;
  gatheringRate: string;
}

interface GatheringData {
  gatheringId?: string;
  groupId: string;
  groupName: string;
  created: boolean;
  place: string;
  worshipAttendance: string;
  worshipRate: string;
  gatheringAttendance: string;
  gatheringRate: string;
  specialNote: string;
  leaderComment?: string;
  adminComment?: string;
}

interface GatheringDetailMember {
  id: string;
  memberId: string;
  memberName: string;
  sex: string;
  birthday: string;
  worshipAttendance: boolean;
  gatheringAttendance: boolean;
  story: string;
  goal: string;
  leaderComment: string;
  prayers: Array<{ id: string; content: string; isAnswered: boolean }>;
}

interface GatheringDetail {
  id: string;
  groupId: string;
  groupName: string;
  date: string;
  place: string;
  leaderComment: string;
  adminComment: string;
  stats: {
    totalMembers: number;
    worshipAttended: number;
    worshipRate: number;
    gatheringAttended: number;
    gatheringRate: number;
  };
  members: GatheringDetailMember[];
}

interface BirthdayMember {
  id: string;
  name: string;
  sex: string;
  birthYear: string;
  month: number;
  day: number;
  dayName: string;
  isToday: boolean;
}

interface BirthdayData {
  targetYear: number;
  targetMonth: number;
  members: BirthdayMember[];
}

// 주차 정보 생성 (해당 월의 주차들, 현재 시점까지만)
function getWeeksOfMonth(year: number, month: number, limitToToday: boolean = false) {
  const weeks: Array<{ key: string; label: string; weekNum: number }> = [];
  
  const today = new Date();
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  let weekNum = 1;
  let currentStart = new Date(firstDay);
  
  while (currentStart <= lastDay) {
    if (limitToToday && currentStart > today) {
      break;
    }
    
    const dayOfWeek = currentStart.getDay();
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
    
    let currentEnd = new Date(currentStart);
    currentEnd.setDate(currentStart.getDate() + daysUntilSaturday);
    
    if (currentEnd > lastDay) {
      currentEnd = new Date(lastDay);
    }
    
    const startStr = `${currentStart.getMonth() + 1}.${currentStart.getDate()}`;
    const endStr = `${currentEnd.getMonth() + 1}.${currentEnd.getDate()}`;
    
    weeks.push({
      key: String(weekNum),
      label: `${weekNum}주차 (${startStr}~${endStr})`,
      weekNum,
    });
    
    currentStart = new Date(currentEnd);
    currentStart.setDate(currentEnd.getDate() + 1);
    weekNum++;
  }
  
  return weeks;
}

// 연도 옵션
function getYearOptions() {
  return [{ key: "2026", label: "2026년" }];
}

// 월 옵션
function getMonthOptions(selectedYear: number) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  
  const maxMonth = selectedYear < currentYear ? 12 : currentMonth;
  
  return Array.from({ length: maxMonth }, (_, i) => ({
    key: String(i + 1),
    label: `${i + 1}월`,
    month: i + 1,
  }));
}

export function DashboardClient() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  
  const yearOptions = useMemo(() => getYearOptions(), []);
  
  const [selectedYear, setSelectedYear] = useState(yearOptions[0].key);
  const [selectedMonth, setSelectedMonth] = useState(String(currentMonth));
  
  const isCurrentYear = Number(selectedYear) === currentYear;
  const isCurrentMonth = isCurrentYear && Number(selectedMonth) === currentMonth;
  
  const monthOptions = useMemo(
    () => getMonthOptions(Number(selectedYear)),
    [selectedYear]
  );
  
  const weeks = useMemo(
    () => getWeeksOfMonth(Number(selectedYear), Number(selectedMonth), isCurrentMonth),
    [selectedYear, selectedMonth, isCurrentMonth]
  );
  
  const [selectedWeek, setSelectedWeek] = useState(weeks[weeks.length - 1]?.key || "1");
  
  // API 데이터 상태
  const [stats, setStats] = useState<StatsData | null>(null);
  const [gatherings, setGatherings] = useState<GatheringData[]>([]);
  const [gatheringDetail, setGatheringDetail] = useState<GatheringDetail | null>(null);
  
  // 로딩 상태
  const [statsLoading, setStatsLoading] = useState(true);
  const [gatheringsLoading, setGatheringsLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // Sheet 상태
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedGathering, setSelectedGathering] = useState<GatheringData | null>(null);
  
  // 생일 상태
  const [birthdayData, setBirthdayData] = useState<BirthdayData | null>(null);
  const [birthdayLoading, setBirthdayLoading] = useState(true);
  const [birthdayOffset, setBirthdayOffset] = useState(0);

  // 목회자 코멘트 상태
  const [pastorComment, setPastorComment] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const [commentSaved, setCommentSaved] = useState(false);

  // 생일 데이터 가져오기
  const fetchBirthdays = useCallback(async (offset: number) => {
    setBirthdayLoading(true);
    try {
      const res = await fetch(`/api/dashboard/birthdays?offset=${offset}`);
      const json = await res.json();
      if (json.success) {
        setBirthdayData(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch birthdays:", error);
    } finally {
      setBirthdayLoading(false);
    }
  }, []);

  // 통계 데이터 가져오기
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`/api/dashboard/stats?year=${selectedYear}`);
      const json = await res.json();
      if (json.success) {
        setStats(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setStatsLoading(false);
    }
  }, [selectedYear]);

  // 주차별 모임 데이터 가져오기
  const fetchGatherings = useCallback(async () => {
    setGatheringsLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/gatherings?year=${selectedYear}&month=${selectedMonth}&week=${selectedWeek}`
      );
      const json = await res.json();
      if (json.success) {
        setGatherings(json.data.gatherings);
      }
    } catch (error) {
      console.error("Failed to fetch gatherings:", error);
    } finally {
      setGatheringsLoading(false);
    }
  }, [selectedYear, selectedMonth, selectedWeek]);

  // 모임 상세 데이터 가져오기
  const fetchGatheringDetail = useCallback(async (gatheringId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/dashboard/gatherings/${gatheringId}`);
      const json = await res.json();
      if (json.success) {
        setGatheringDetail(json.data);
        setPastorComment(json.data.adminComment || "");
      }
    } catch (error) {
      console.error("Failed to fetch gathering detail:", error);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // 목회자 코멘트 저장
  const saveAdminComment = async () => {
    if (!selectedGathering?.gatheringId) return;
    
    setSavingComment(true);
    setCommentSaved(false);
    try {
      const res = await fetch(`/api/dashboard/gatherings/${selectedGathering.gatheringId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminComment: pastorComment }),
      });
      const json = await res.json();
      if (json.success) {
        // 성공 시 로컬 상태 업데이트
        if (gatheringDetail) {
          setGatheringDetail({ ...gatheringDetail, adminComment: pastorComment });
        }
        // 저장 성공 표시
        setCommentSaved(true);
        setTimeout(() => setCommentSaved(false), 2500);
      }
    } catch (error) {
      console.error("Failed to save comment:", error);
    } finally {
      setSavingComment(false);
    }
  };

  // 연도 변경 시 통계 다시 가져오기
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // 생일 데이터 (offset 변경 시)
  useEffect(() => {
    fetchBirthdays(birthdayOffset);
  }, [fetchBirthdays, birthdayOffset]);

  // 주차 변경 시 모임 데이터 다시 가져오기
  useEffect(() => {
    fetchGatherings();
  }, [fetchGatherings]);

  // 월 변경 핸들러
  const handleMonthChange = (value: string) => {
    setSelectedMonth(value);
    const isCurrentMo = isCurrentYear && Number(value) === currentMonth;
    const newWeeks = getWeeksOfMonth(Number(selectedYear), Number(value), isCurrentMo);
    setSelectedWeek(newWeeks[newWeeks.length - 1]?.key || "1");
  };
  
  // 연도 변경 핸들러
  const handleYearChange = (value: string) => {
    setSelectedYear(value);
    const isCurrYear = Number(value) === currentYear;
    const newMonth = isCurrYear ? currentMonth : 12;
    setSelectedMonth(String(newMonth));
    
    const isCurrentMo = isCurrYear && newMonth === currentMonth;
    const newWeeks = getWeeksOfMonth(Number(value), newMonth, isCurrentMo);
    setSelectedWeek(newWeeks[newWeeks.length - 1]?.key || "1");
  };

  // 이전/다음 주차 이동 핸들러
  const handlePrevWeek = () => {
    const currentWeekIndex = weeks.findIndex((w) => w.key === selectedWeek);
    if (currentWeekIndex > 0) {
      // 이전 주차로
      setSelectedWeek(weeks[currentWeekIndex - 1].key);
    } else {
      // 이전 달의 마지막 주차로
      const currentMonthNum = Number(selectedMonth);
      if (currentMonthNum > 1) {
        const prevMonth = String(currentMonthNum - 1);
        const prevMonthWeeks = getWeeksOfMonth(Number(selectedYear), currentMonthNum - 1, false);
        setSelectedMonth(prevMonth);
        setSelectedWeek(prevMonthWeeks[prevMonthWeeks.length - 1]?.key || "1");
      } else {
        // 이전 연도 12월로
        const prevYear = String(Number(selectedYear) - 1);
        const prevMonthWeeks = getWeeksOfMonth(Number(prevYear), 12, false);
        setSelectedYear(prevYear);
        setSelectedMonth("12");
        setSelectedWeek(prevMonthWeeks[prevMonthWeeks.length - 1]?.key || "1");
      }
    }
  };

  const handleNextWeek = () => {
    const currentWeekIndex = weeks.findIndex((w) => w.key === selectedWeek);
    if (currentWeekIndex < weeks.length - 1) {
      // 다음 주차로
      setSelectedWeek(weeks[currentWeekIndex + 1].key);
    } else {
      // 다음 달의 첫 주차로
      const currentMonthNum = Number(selectedMonth);
      const currentYearNum = Number(selectedYear);
      
      // 현재 연도/월 제한 체크
      if (currentYearNum === currentYear && currentMonthNum >= currentMonth) {
        return; // 현재 달 이후로는 이동 불가
      }
      
      if (currentMonthNum < 12) {
        const nextMonth = String(currentMonthNum + 1);
        setSelectedMonth(nextMonth);
        setSelectedWeek("1");
      } else {
        // 다음 연도 1월로
        const nextYear = String(currentYearNum + 1);
        if (Number(nextYear) <= currentYear) {
          setSelectedYear(nextYear);
          setSelectedMonth("1");
          setSelectedWeek("1");
        }
      }
    }
  };

  // 이전/다음 버튼 비활성화 상태
  const canGoPrev = true; // 과거로는 항상 이동 가능
  const canGoNext = !(Number(selectedYear) === currentYear && 
                      Number(selectedMonth) === currentMonth && 
                      weeks.findIndex((w) => w.key === selectedWeek) === weeks.length - 1);
  
  // 소모임 클릭 핸들러
  const handleGroupClick = (gathering: GatheringData) => {
    if (!gathering.created || !gathering.gatheringId) return;
    setSelectedGathering(gathering);
    setSheetOpen(true);
    fetchGatheringDetail(gathering.gatheringId);
  };
  
  // 엑셀 다운로드
  const handleExcelDownload = () => {
    if (gatherings.length === 0) return;
    
    const selectedWeekInfo = weeks.find((w) => w.key === selectedWeek);
    const weekLabel = selectedWeekInfo?.label || selectedWeek;
    
    const excelData = gatherings.map((g) => ({
      소모임: g.groupName,
      생성여부: g.created ? "O" : "X",
      "예배 출석": g.worshipAttendance,
      "예배 출석률": g.worshipRate,
      "소모임 출석": g.gatheringAttendance,
      "소모임 출석률": g.gatheringRate,
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "주차별 모임 현황");
    
    const fileName = `주차별_모임_현황_${selectedYear}년_${selectedMonth}월_${weekLabel.split(" ")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // 통계 카드 데이터
  const statsCards = [
    {
      title: "전체 멤버",
      value: stats ? String(stats.totalMembers) : "-",
      description: "등록된 교적부 인원",
      icon: Users,
    },
    {
      title: "활성 소모임",
      value: stats ? String(stats.activeGroups) : "-",
      description: "현재 운영중인 소모임",
      icon: UsersRound,
    },
    {
      title: "전체 예배 참석률",
      value: stats?.worshipRate || "-",
      description: "생성된 소모임 기준",
      icon: Church,
    },
    {
      title: "전체 소모임 참석률",
      value: stats?.gatheringRate || "-",
      description: "생성된 소모임 기준",
      icon: HandHeart,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Year Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            대시보드
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            현황을 한눈에 확인하세요
          </p>
        </div>
        <Select value={selectedYear} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((opt) => (
              <SelectItem key={opt.key} value={opt.key}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title} className="border-slate-200 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  <span className="text-slate-400">로딩중...</span>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stat.value}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {stat.description}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 월간 생일 */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cake className="h-5 w-5 text-pink-500" />
              <CardTitle className="text-slate-900 dark:text-white">
                {birthdayData
                  ? `${birthdayData.targetYear}년 ${birthdayData.targetMonth}월 생일`
                  : birthdayOffset === 0
                    ? "이번달 생일"
                    : birthdayOffset === -1
                      ? "지난달 생일"
                      : birthdayOffset === 1
                        ? "다음달 생일"
                        : `${birthdayOffset > 0 ? "+" : ""}${birthdayOffset}개월 생일`}
              </CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setBirthdayOffset((v) => v - 1)}
                disabled={birthdayLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {birthdayOffset !== 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setBirthdayOffset(0)}
                  disabled={birthdayLoading}
                >
                  이번달
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setBirthdayOffset((v) => v + 1)}
                disabled={birthdayLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {birthdayLoading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              <span className="text-sm text-slate-400">로딩중...</span>
            </div>
          ) : !birthdayData || birthdayData.members.length === 0 ? (
            <p className="py-2 text-sm text-slate-400">해당 월에 생일인 멤버가 없습니다.</p>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
              {birthdayData.members.map((m) => (
                <div
                  key={m.id}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm ${
                    m.isToday
                      ? "border-pink-300 bg-pink-50 dark:border-pink-700 dark:bg-pink-900/20"
                      : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50"
                  }`}
                >
                  <Cake className={`h-3.5 w-3.5 ${m.isToday ? "text-pink-500" : "text-slate-400"}`} />
                  <span className="font-medium text-slate-900 dark:text-white">
                    {m.name}
                  </span>
                  {m.sex && (
                    <span className="text-xs text-slate-400">
                      {m.sex === "M" ? "남" : "여"}
                    </span>
                  )}
                  <span className={`inline-flex rounded-full px-1.5 py-0.5 text-xs font-medium ${
                    m.isToday
                      ? "bg-pink-200 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300"
                      : "bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400"
                  }`}>
                    {m.month}/{m.day}({m.dayName})
                    {m.isToday && " 🎂"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Gatherings */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-slate-900 dark:text-white">
                주차별 모임 현황
              </CardTitle>
              <CardDescription>
                해당 주차에 생성된 모임 목록
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* 이전 버튼 */}
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevWeek}
                disabled={!canGoPrev}
                title="이전 주차"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Select value={selectedMonth} onValueChange={handleMonthChange}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weeks.map((week) => (
                    <SelectItem key={week.key} value={week.key}>
                      {week.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* 다음 버튼 */}
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextWeek}
                disabled={!canGoNext}
                title="다음 주차"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleExcelDownload}
                disabled={gatherings.length === 0}
                title="엑셀 다운로드"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {gatheringsLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto mb-2" />
              <span className="text-slate-500 dark:text-slate-400">모임 데이터를 불러오는 중...</span>
            </div>
          ) : gatherings.length === 0 ? (
            <div className="py-8 text-center text-slate-500 dark:text-slate-400">
              해당 주차에 생성된 모임이 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                      소모임
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-slate-500 dark:text-slate-400">
                      생성여부
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                      모임 장소
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                      예배 출석
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                      소모임 출석
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                      특이사항
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {gatherings.map((gathering) => (
                    <tr
                      key={gathering.groupId}
                      className={`border-b border-slate-100 dark:border-slate-800 ${
                        gathering.created 
                          ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" 
                          : "opacity-60"
                      }`}
                      onClick={() => handleGroupClick(gathering)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 dark:text-white">
                            {gathering.groupName}
                          </span>
                          {gathering.created && (
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {gathering.created ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                            O
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            X
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {gathering.place || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600 dark:text-slate-300">
                            {gathering.worshipAttendance}
                          </span>
                          {gathering.worshipRate !== "-" && (
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              {gathering.worshipRate}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600 dark:text-slate-300">
                            {gathering.gatheringAttendance}
                          </span>
                          {gathering.gatheringRate !== "-" && (
                            <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                              {gathering.gatheringRate}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {gathering.specialNote ? (
                          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span className="text-xs">{gathering.specialNote}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 소모임 상세 Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[500px] sm:w-[560px] sm:max-w-none p-0 flex flex-col">
          {/* 헤더 영역 */}
          <div className="bg-slate-100 dark:bg-slate-800 px-6 py-4 shrink-0 border-b border-slate-200 dark:border-slate-700">
            <SheetHeader>
              <SheetTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
                    <UsersRound className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div>
                    <div className="text-base font-bold text-slate-900 dark:text-white">
                      {gatheringDetail?.groupName || selectedGathering?.groupName}
                    </div>
                    <div className="text-xs font-normal text-slate-500">
                      {weeks.find((w) => w.key === selectedWeek)?.label}
                    </div>
                  </div>
                </div>
                {/* 출석 요약 */}
                {gatheringDetail && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Church className="h-3.5 w-3.5 text-blue-500" />
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {gatheringDetail.stats.worshipAttended}/{gatheringDetail.stats.totalMembers}
                      </span>
                      <span className="text-slate-400 text-xs">{gatheringDetail.stats.worshipRate}%</span>
                    </div>
                    <div className="h-4 w-px bg-slate-300 dark:bg-slate-600" />
                    <div className="flex items-center gap-1.5">
                      <HandHeart className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {gatheringDetail.stats.gatheringAttended}/{gatheringDetail.stats.totalMembers}
                      </span>
                      <span className="text-slate-400 text-xs">{gatheringDetail.stats.gatheringRate}%</span>
                    </div>
                  </div>
                )}
              </SheetTitle>
            </SheetHeader>
          </div>
          
          {/* 스크롤 영역 */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {detailLoading ? (
              <div className="py-12 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto mb-2" />
                <span className="text-slate-500">상세 정보를 불러오는 중...</span>
              </div>
            ) : gatheringDetail ? (
              <>
                {/* 리더 코멘트 */}
                <div className="mb-5">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">리더 코멘트</h3>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-600 dark:text-slate-300">
                    {gatheringDetail.leaderComment || (
                      <span className="text-slate-400 italic">리더 코멘트가 없습니다</span>
                    )}
                  </div>
                </div>
                
                {/* 목회자 코멘트 */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">목회자 코멘트</h3>
                  <Textarea
                    placeholder="목회자 코멘트를 입력하세요..."
                    className="min-h-[80px] resize-none"
                    value={pastorComment}
                    onChange={(e) => setPastorComment(e.target.value)}
                  />
                  <div className="mt-2 flex items-center justify-end gap-3">
                    {commentSaved && (
                      <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 animate-in fade-in slide-in-from-right-2">
                        <Check className="h-4 w-4" />
                        목회자 코멘트가 저장되었습니다
                      </span>
                    )}
                    <Button 
                      size="sm" 
                      className={commentSaved 
                        ? "bg-emerald-600 hover:bg-emerald-700" 
                        : "bg-slate-800 hover:bg-slate-700"
                      }
                      onClick={saveAdminComment}
                      disabled={savingComment}
                    >
                      {savingComment ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          저장중...
                        </>
                      ) : commentSaved ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          저장됨
                        </>
                      ) : (
                        "저장"
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* 멤버 목록 */}
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  소모임원 ({gatheringDetail.members.length}명)
                </h3>
                <div className="space-y-3">
                  {gatheringDetail.members.map((member) => (
                    <div
                      key={member.id}
                      className={`rounded-lg border transition-all ${
                        member.gatheringAttendance
                          ? "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50"
                          : "border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/30"
                      }`}
                    >
                      {/* 멤버 헤더 */}
                      <div className={`flex items-center justify-between p-3 ${
                        (member.story || member.goal || member.prayers.length > 0)
                          ? "border-b border-slate-100 dark:border-slate-700"
                          : ""
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900 dark:text-white">
                                {member.memberName}
                              </span>
                              <span className="text-xs text-slate-400">
                                {member.sex === "M" ? "남" : member.sex === "F" ? "여" : ""}
                                {member.sex && member.birthday && " · "}
                                {member.birthday && member.birthday.replace(/-/g, ".")}
                              </span>
                            </div>
                            {!member.gatheringAttendance && (
                              <span className="text-xs text-slate-400">소모임 불참</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`flex items-center gap-1 rounded-full px-2 py-1 ${
                            member.worshipAttendance
                              ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-slate-100 text-slate-400 dark:bg-slate-700"
                          }`}>
                            {member.worshipAttendance ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            예배
                          </span>
                          <span className={`flex items-center gap-1 rounded-full px-2 py-1 ${
                            member.gatheringAttendance
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-slate-100 text-slate-400 dark:bg-slate-700"
                          }`}>
                            {member.gatheringAttendance ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            소모임
                          </span>
                        </div>
                      </div>
                      
                      {/* 나눔 / 한주목표 / 기도제목 */}
                      {(member.story || member.goal || member.prayers.length > 0) && (
                        <div className="space-y-2 p-3 text-sm">
                          {member.story && (
                            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3">
                              <div className="flex items-center gap-2 mb-1.5">
                                <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">나눔</span>
                              </div>
                              <p className="text-slate-700 dark:text-slate-200 leading-relaxed pl-6">
                                {member.story}
                              </p>
                            </div>
                          )}
                          
                          {member.goal && (
                            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
                              <div className="flex items-center gap-2 mb-1.5">
                                <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">한주 목표</span>
                              </div>
                              <p className="text-slate-700 dark:text-slate-200 leading-relaxed pl-6">
                                {member.goal}
                              </p>
                            </div>
                          )}
                          
                          {member.prayers.length > 0 && (
                            <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 p-3">
                              <div className="flex items-center gap-2 mb-1.5">
                                <HandHeart className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                <span className="text-xs font-semibold text-purple-700 dark:text-purple-400">기도제목</span>
                              </div>
                              <ul className="space-y-1.5 pl-6">
                                {member.prayers.map((prayer) => (
                                  <li
                                    key={prayer.id}
                                    className="flex items-start gap-2 text-slate-700 dark:text-slate-200 leading-relaxed"
                                  >
                                    {prayer.isAnswered ? (
                                      <Check className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
                                    ) : (
                                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
                                    )}
                                    <span className={prayer.isAnswered ? "text-emerald-600 dark:text-emerald-400" : ""}>
                                      {prayer.content}
                                      {prayer.isAnswered && <span className="ml-1 text-xs">(응답됨)</span>}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {gatheringDetail.members.length === 0 && (
                    <div className="py-8 text-center">
                      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                        <Users className="h-5 w-5 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        소모임원 데이터가 없습니다
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-slate-500">
                데이터를 불러올 수 없습니다
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
