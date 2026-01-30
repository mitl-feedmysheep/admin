"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UsersRound, Church, HandHeart, Download, ChevronRight, User, Check, X, AlertCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";

// 연도별 통계 데이터 (TODO: 실제 DB 연동)
const statsByYear: Record<string, {
  totalMembers: number;
  activeGroups: number;
  worshipRate: string;
  gatheringRate: string;
}> = {
  "2026": {
    totalMembers: 156,
    activeGroups: 14,
    worshipRate: "82%",
    gatheringRate: "75%",
  },
  "2025": {
    totalMembers: 142,
    activeGroups: 12,
    worshipRate: "78%",
    gatheringRate: "71%",
  },
  "2024": {
    totalMembers: 128,
    activeGroups: 10,
    worshipRate: "75%",
    gatheringRate: "68%",
  },
};

// 전체 소모임 목록 (TODO: 실제 DB에서 조회)
const allGroups = [
  "강소정 셀",
  "강혜정 셀",
  "김민지 셀",
  "김수지 셀",
  "류희재 셀",
  "박예슬 셀",
  "배나현 셀",
  "석지원 셀",
  "유미미 셀",
  "최예환 셀",
  "한지은 셀",
];

// 주차별 모임 데이터 (TODO: 실제 DB 연동)
interface GatheringData {
  group: string;
  created: boolean;
  worshipAttendance: string;
  worshipRate: string;
  gatheringAttendance: string;
  gatheringRate: string;
}

// 리더 코멘트 / 목회자 코멘트 데이터 (TODO: 실제 DB 연동)
interface GatheringComments {
  leaderComment: string;
  pastorComment: string;
}

const mockGatheringComments: Record<string, Record<string, GatheringComments>> = {
  "2026-01-5": {
    "강소정 셀": { leaderComment: "새해 첫 모임이라 활동지를 진행했습니다. 서로의 2026년 기도제목을 나누는 시간을 가졌습니다.", pastorComment: "" },
    "강혜정 셀": { leaderComment: "오랜만에 전원 참석해서 감사했습니다.", pastorComment: "셀이 잘 성장하고 있네요. 화이팅!" },
    "김민지 셀": { leaderComment: "새 멤버가 적응을 잘 하고 있어요.", pastorComment: "" },
    "최예환 셀": { leaderComment: "", pastorComment: "" },
  },
};

// 특이사항 데이터 (TODO: 실제 DB 연동)
const mockSpecialNotes: Record<string, Record<string, string>> = {
  "2026-01-5": {
    "강소정 셀": "",
    "강혜정 셀": "새 멤버 1명 합류 예정",
    "김민지 셀": "",
    "최예환 셀": "리더 해외출장으로 다음주 모임 취소",
  },
};

// 생성된 모임 데이터만 저장 (created: true인 것들)
const mockCreatedGatherings: Record<string, Record<string, Omit<GatheringData, "group" | "created">>> = {
  "2026-01-1": {
    "강소정 셀": { worshipAttendance: "6/8", worshipRate: "75%", gatheringAttendance: "5/8", gatheringRate: "62%" },
    "강혜정 셀": { worshipAttendance: "5/6", worshipRate: "83%", gatheringAttendance: "5/6", gatheringRate: "83%" },
    "김민지 셀": { worshipAttendance: "6/7", worshipRate: "86%", gatheringAttendance: "5/7", gatheringRate: "71%" },
    "류희재 셀": { worshipAttendance: "9/10", worshipRate: "90%", gatheringAttendance: "8/10", gatheringRate: "80%" },
    "박예슬 셀": { worshipAttendance: "8/9", worshipRate: "89%", gatheringAttendance: "7/9", gatheringRate: "78%" },
    "최예환 셀": { worshipAttendance: "7/8", worshipRate: "88%", gatheringAttendance: "7/8", gatheringRate: "88%" },
  },
  "2026-01-2": {
    "강소정 셀": { worshipAttendance: "7/8", worshipRate: "88%", gatheringAttendance: "6/8", gatheringRate: "75%" },
    "강혜정 셀": { worshipAttendance: "5/6", worshipRate: "83%", gatheringAttendance: "4/6", gatheringRate: "67%" },
    "김민지 셀": { worshipAttendance: "7/7", worshipRate: "100%", gatheringAttendance: "6/7", gatheringRate: "86%" },
    "류희재 셀": { worshipAttendance: "10/10", worshipRate: "100%", gatheringAttendance: "9/10", gatheringRate: "90%" },
    "석지원 셀": { worshipAttendance: "8/9", worshipRate: "89%", gatheringAttendance: "6/9", gatheringRate: "67%" },
    "유미미 셀": { worshipAttendance: "8/9", worshipRate: "89%", gatheringAttendance: "6/9", gatheringRate: "67%" },
    "최예환 셀": { worshipAttendance: "8/8", worshipRate: "100%", gatheringAttendance: "7/8", gatheringRate: "88%" },
  },
  "2026-01-3": {
    "강소정 셀": { worshipAttendance: "8/8", worshipRate: "100%", gatheringAttendance: "7/8", gatheringRate: "88%" },
    "강혜정 셀": { worshipAttendance: "6/6", worshipRate: "100%", gatheringAttendance: "5/6", gatheringRate: "83%" },
    "박예슬 셀": { worshipAttendance: "9/9", worshipRate: "100%", gatheringAttendance: "8/9", gatheringRate: "89%" },
    "배나현 셀": { worshipAttendance: "6/7", worshipRate: "86%", gatheringAttendance: "5/7", gatheringRate: "71%" },
    "석지원 셀": { worshipAttendance: "9/9", worshipRate: "100%", gatheringAttendance: "7/9", gatheringRate: "78%" },
    "한지은 셀": { worshipAttendance: "4/9", worshipRate: "44%", gatheringAttendance: "4/9", gatheringRate: "44%" },
  },
  "2026-01-4": {
    "강소정 셀": { worshipAttendance: "6/8", worshipRate: "75%", gatheringAttendance: "5/8", gatheringRate: "62%" },
    "김민지 셀": { worshipAttendance: "6/7", worshipRate: "86%", gatheringAttendance: "5/7", gatheringRate: "71%" },
    "류희재 셀": { worshipAttendance: "8/10", worshipRate: "80%", gatheringAttendance: "7/10", gatheringRate: "70%" },
    "김수지 셀": { worshipAttendance: "4/8", worshipRate: "50%", gatheringAttendance: "4/8", gatheringRate: "50%" },
    "유미미 셀": { worshipAttendance: "6/9", worshipRate: "67%", gatheringAttendance: "6/9", gatheringRate: "67%" },
  },
  "2026-01-5": {
    "강소정 셀": { worshipAttendance: "7/8", worshipRate: "88%", gatheringAttendance: "6/8", gatheringRate: "75%" },
    "강혜정 셀": { worshipAttendance: "6/6", worshipRate: "100%", gatheringAttendance: "5/6", gatheringRate: "83%" },
    "김민지 셀": { worshipAttendance: "7/7", worshipRate: "100%", gatheringAttendance: "7/7", gatheringRate: "100%" },
    "최예환 셀": { worshipAttendance: "8/8", worshipRate: "100%", gatheringAttendance: "7/8", gatheringRate: "88%" },
  },
};

// 전체 소모임 목록 기반으로 주차별 데이터 생성
function getGatheringsForWeek(weekKey: string): GatheringData[] {
  const createdData = mockCreatedGatherings[weekKey] || {};
  
  return allGroups.map((group) => {
    const data = createdData[group];
    if (data) {
      return {
        group,
        created: true,
        ...data,
      };
    } else {
      return {
        group,
        created: false,
        worshipAttendance: "-",
        worshipRate: "-",
        gatheringAttendance: "-",
        gatheringRate: "-",
      };
    }
  });
}

// 소모임원별 상세 데이터 (TODO: 실제 DB 연동)
interface MemberDetail {
  id: string;
  name: string;
  role: "LEADER" | "MEMBER";
  worshipAttendance: boolean;
  gatheringAttendance: boolean;
  story: string;
  weeklyGoal: string;
  prayerRequests: string[];
}

const mockMemberDetails: Record<string, MemberDetail[]> = {
  "강소정 셀": [
    { id: "1", name: "강소정", role: "LEADER", worshipAttendance: true, gatheringAttendance: true, story: "이번 주 회사에서 좋은 일이 있었어요", weeklyGoal: "하루의 시작을 기도로 시작하기", prayerRequests: ["셀리더로서 지혜롭게 섬길 수 있도록", "가족들의 건강을 위해"] },
    { id: "2", name: "변재욱", role: "MEMBER", worshipAttendance: true, gatheringAttendance: true, story: "", weeklyGoal: "매일 성경 1장씩 읽기", prayerRequests: ["취업 준비가 잘 되도록"] },
    { id: "3", name: "서현제", role: "MEMBER", worshipAttendance: true, gatheringAttendance: false, story: "", weeklyGoal: "", prayerRequests: [] },
    { id: "4", name: "안혜인", role: "MEMBER", worshipAttendance: true, gatheringAttendance: true, story: "친구와 화해했어요", weeklyGoal: "감사일기 쓰기", prayerRequests: ["학업에 집중할 수 있도록", "좋은 친구들과의 관계"] },
    { id: "5", name: "이민주", role: "MEMBER", worshipAttendance: false, gatheringAttendance: false, story: "", weeklyGoal: "", prayerRequests: [] },
    { id: "6", name: "정지환", role: "MEMBER", worshipAttendance: true, gatheringAttendance: true, story: "", weeklyGoal: "운동 주 3회", prayerRequests: ["건강 회복"] },
    { id: "7", name: "조정빈", role: "MEMBER", worshipAttendance: true, gatheringAttendance: true, story: "새로운 프로젝트 시작", weeklyGoal: "", prayerRequests: ["프로젝트 성공적으로 마무리"] },
    { id: "8", name: "최고은", role: "MEMBER", worshipAttendance: true, gatheringAttendance: true, story: "", weeklyGoal: "말씀 묵상하기", prayerRequests: [] },
  ],
  "강혜정 셀": [
    { id: "9", name: "강혜정", role: "LEADER", worshipAttendance: true, gatheringAttendance: true, story: "", weeklyGoal: "셀원들 위해 매일 기도", prayerRequests: ["셀이 은혜 가운데 성장하도록"] },
    { id: "10", name: "김영희", role: "MEMBER", worshipAttendance: true, gatheringAttendance: true, story: "감사한 일주일", weeklyGoal: "", prayerRequests: ["부모님 건강"] },
    { id: "11", name: "박철수", role: "MEMBER", worshipAttendance: true, gatheringAttendance: false, story: "", weeklyGoal: "새벽기도 참석", prayerRequests: [] },
    { id: "12", name: "이수진", role: "MEMBER", worshipAttendance: true, gatheringAttendance: true, story: "", weeklyGoal: "", prayerRequests: ["진로 결정에 지혜를"] },
    { id: "13", name: "정민호", role: "MEMBER", worshipAttendance: true, gatheringAttendance: true, story: "이직 준비 중", weeklyGoal: "하루 30분 독서", prayerRequests: ["좋은 회사로 이직", "면접 잘 보도록"] },
    { id: "14", name: "한지영", role: "MEMBER", worshipAttendance: true, gatheringAttendance: true, story: "", weeklyGoal: "", prayerRequests: [] },
  ],
  "김민지 셀": [
    { id: "15", name: "김민지", role: "LEADER", worshipAttendance: true, gatheringAttendance: true, story: "셀 모임 준비하며 은혜받음", weeklyGoal: "셀원 한명씩 연락하기", prayerRequests: ["리더로서 본이 되는 삶"] },
    { id: "16", name: "김태희", role: "MEMBER", worshipAttendance: true, gatheringAttendance: true, story: "", weeklyGoal: "", prayerRequests: [] },
    { id: "17", name: "박지훈", role: "MEMBER", worshipAttendance: true, gatheringAttendance: true, story: "", weeklyGoal: "큐티 매일하기", prayerRequests: ["영적 성장"] },
    { id: "18", name: "이서연", role: "MEMBER", worshipAttendance: true, gatheringAttendance: true, story: "축복받은 한 주", weeklyGoal: "", prayerRequests: ["시험 잘 보도록", "체력 유지"] },
    { id: "19", name: "장현우", role: "MEMBER", worshipAttendance: true, gatheringAttendance: true, story: "", weeklyGoal: "", prayerRequests: [] },
    { id: "20", name: "최유나", role: "MEMBER", worshipAttendance: true, gatheringAttendance: true, story: "", weeklyGoal: "감사 생활하기", prayerRequests: ["가정의 평화"] },
    { id: "21", name: "홍길동", role: "MEMBER", worshipAttendance: true, gatheringAttendance: true, story: "", weeklyGoal: "", prayerRequests: [] },
  ],
};

// 주차 정보 생성 (해당 월의 주차들, 현재 시점까지만)
function getWeeksOfMonth(year: number, month: number, limitToToday: boolean = false) {
  const weeks: Array<{ key: string; label: string; start: string; end: string }> = [];
  
  const today = new Date();
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  let weekNum = 1;
  let currentStart = new Date(firstDay);
  
  while (currentStart <= lastDay) {
    // 현재 시점 제한이 있고, 주차 시작일이 오늘 이후면 중단
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
      key: `${year}-${String(month).padStart(2, "0")}-${weekNum}`,
      label: `${weekNum}주차 (${startStr}~${endStr})`,
      start: currentStart.toISOString().split("T")[0],
      end: currentEnd.toISOString().split("T")[0],
    });
    
    currentStart = new Date(currentEnd);
    currentStart.setDate(currentEnd.getDate() + 1);
    weekNum++;
  }
  
  return weeks;
}

// 연도 옵션 (TODO: 추후 확장)
function getYearOptions() {
  return [{ key: "2026", label: "2026년" }];
}

// 월 옵션 (현재 연도면 현재 월까지만, 과거 연도면 전체)
function getMonthOptions(selectedYear: number) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  
  // 과거 연도면 12월까지, 현재 연도면 현재 월까지
  const maxMonth = selectedYear < currentYear ? 12 : currentMonth;
  
  return Array.from({ length: maxMonth }, (_, i) => ({
    key: String(i + 1).padStart(2, "0"),
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
  const [selectedMonth, setSelectedMonth] = useState(String(currentMonth).padStart(2, "0"));
  
  // 현재 연도인지 확인
  const isCurrentYear = Number(selectedYear) === currentYear;
  const isCurrentMonth = isCurrentYear && Number(selectedMonth) === currentMonth;
  
  // 월 옵션 (현재 연도면 현재 월까지만)
  const monthOptions = useMemo(
    () => getMonthOptions(Number(selectedYear)),
    [selectedYear]
  );
  
  // 주차 옵션 (현재 월이면 현재 주차까지만)
  const weeks = useMemo(
    () => getWeeksOfMonth(Number(selectedYear), Number(selectedMonth), isCurrentMonth),
    [selectedYear, selectedMonth, isCurrentMonth]
  );
  
  const [selectedWeek, setSelectedWeek] = useState(weeks[weeks.length - 1]?.key || "");
  
  // 월이 변경되면 해당 월의 마지막 주차로 초기화
  const handleMonthChange = (value: string) => {
    setSelectedMonth(value);
    const isCurrentMo = isCurrentYear && Number(value) === currentMonth;
    const newWeeks = getWeeksOfMonth(Number(selectedYear), Number(value), isCurrentMo);
    setSelectedWeek(newWeeks[newWeeks.length - 1]?.key || "");
  };
  
  // 연도가 변경되면 월/주차도 초기화
  const handleYearChange = (value: string) => {
    setSelectedYear(value);
    const isCurrYear = Number(value) === currentYear;
    
    // 현재 연도면 현재 월, 과거 연도면 12월
    const newMonth = isCurrYear ? currentMonth : 12;
    setSelectedMonth(String(newMonth).padStart(2, "0"));
    
    const isCurrentMo = isCurrYear && newMonth === currentMonth;
    const newWeeks = getWeeksOfMonth(Number(value), newMonth, isCurrentMo);
    setSelectedWeek(newWeeks[newWeeks.length - 1]?.key || "");
  };
  
  // 선택된 연도의 통계
  const yearStats = statsByYear[selectedYear] || statsByYear["2026"];
  
  // 선택된 주차의 모임 데이터 (전체 소모임 기준)
  const gatherings = useMemo(() => getGatheringsForWeek(selectedWeek), [selectedWeek]);
  
  // Sheet 상태
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GatheringData | null>(null);
  
  // 소모임 클릭 핸들러
  const handleGroupClick = (gathering: GatheringData) => {
    if (!gathering.created) return; // 생성되지 않은 모임은 클릭 불가
    setSelectedGroup(gathering);
    setSheetOpen(true);
  };
  
  // 선택된 소모임의 멤버 상세 데이터
  const selectedMembers = selectedGroup ? (mockMemberDetails[selectedGroup.group] || []) : [];
  
  // 엑셀 다운로드 함수
  const handleExcelDownload = () => {
    if (gatherings.length === 0) return;
    
    // 현재 선택된 주차 정보 가져오기
    const selectedWeekInfo = weeks.find((w) => w.key === selectedWeek);
    const weekLabel = selectedWeekInfo?.label || selectedWeek;
    
    // 엑셀 데이터 준비
    const excelData = gatherings.map((g) => ({
      소모임: g.group,
      생성여부: g.created ? "O" : "X",
      "예배 출석": g.worshipAttendance,
      "예배 출석률": g.worshipRate,
      "소모임 출석": g.gatheringAttendance,
      "소모임 출석률": g.gatheringRate,
    }));
    
    // 워크시트 생성
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "주차별 모임 현황");
    
    // 파일명 생성
    const fileName = `주차별_모임_현황_${selectedYear}년_${selectedMonth}월_${weekLabel.split(" ")[0]}.xlsx`;
    
    // 다운로드
    XLSX.writeFile(workbook, fileName);
  };
  
  const stats = [
    {
      title: "전체 멤버",
      value: String(yearStats.totalMembers),
      description: "등록된 교적부 인원",
      icon: Users,
    },
    {
      title: "활성 소모임",
      value: String(yearStats.activeGroups),
      description: "현재 운영중인 소모임",
      icon: UsersRound,
    },
    {
      title: "전체 예배 참석률",
      value: yearStats.worshipRate,
      description: "생성된 소모임 기준",
      icon: Church,
    },
    {
      title: "전체 소모임 참석률",
      value: yearStats.gatheringRate,
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
            IntoTheHeaven 관리자 현황을 한눈에 확인하세요
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
            </CardContent>
          </Card>
        ))}
      </div>

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
            <div className="flex gap-2">
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
          {gatherings.length === 0 ? (
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
                  {gatherings.map((gathering, index) => (
                    <tr
                      key={index}
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
                            {gathering.group}
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
                        {(() => {
                          const note = mockSpecialNotes[selectedWeek]?.[gathering.group];
                          if (note) {
                            return (
                              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span className="text-xs">{note}</span>
                              </div>
                            );
                          }
                          return <span className="text-slate-300 dark:text-slate-600">-</span>;
                        })()}
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
                    <div className="text-base font-bold text-slate-900 dark:text-white">{selectedGroup?.group}</div>
                    <div className="text-xs font-normal text-slate-500">
                      {weeks.find((w) => w.key === selectedWeek)?.label}
                    </div>
                  </div>
                </div>
                {/* 출석 요약 - 간소화 */}
                {selectedGroup && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Church className="h-3.5 w-3.5 text-blue-500" />
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedGroup.worshipAttendance}</span>
                      <span className="text-slate-400 text-xs">{selectedGroup.worshipRate}</span>
                    </div>
                    <div className="h-4 w-px bg-slate-300 dark:bg-slate-600" />
                    <div className="flex items-center gap-1.5">
                      <HandHeart className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedGroup.gatheringAttendance}</span>
                      <span className="text-slate-400 text-xs">{selectedGroup.gatheringRate}</span>
                    </div>
                  </div>
                )}
              </SheetTitle>
            </SheetHeader>
          </div>
          
          {/* 스크롤 영역 */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* 리더 코멘트 */}
            {selectedGroup && (
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">리더 코멘트</h3>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-600 dark:text-slate-300">
                  {mockGatheringComments[selectedWeek]?.[selectedGroup.group]?.leaderComment || (
                    <span className="text-slate-400 italic">리더 코멘트가 없습니다</span>
                  )}
                </div>
              </div>
            )}
            
            {/* 목회자 코멘트 */}
            {selectedGroup && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">목회자 코멘트</h3>
                <Textarea
                  placeholder="목회자 코멘트를 입력하세요..."
                  className="min-h-[80px] resize-none"
                  defaultValue={mockGatheringComments[selectedWeek]?.[selectedGroup.group]?.pastorComment || ""}
                />
                <div className="mt-2 flex justify-end">
                  <Button size="sm" className="bg-slate-800 hover:bg-slate-700">
                    저장
                  </Button>
                </div>
              </div>
            )}
            
            {/* 멤버 목록 */}
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              소모임원 ({selectedMembers.length}명)
            </h3>
            <div className="space-y-3">
              {selectedMembers.map((member) => (
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
                    member.gatheringAttendance && (member.story || member.weeklyGoal || member.prayerRequests.length > 0)
                      ? "border-b border-slate-100 dark:border-slate-700"
                      : ""
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full ${
                        member.role === "LEADER"
                          ? "bg-slate-800 text-white dark:bg-slate-600"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                      }`}>
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 dark:text-white">
                            {member.name}
                          </span>
                          {member.role === "LEADER" && (
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-white dark:bg-slate-600">
                              리더
                            </span>
                          )}
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
                  {member.gatheringAttendance && (member.story || member.weeklyGoal || member.prayerRequests.length > 0) && (
                    <div className="space-y-2.5 p-3 text-sm">
                      {member.story && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">나눔</p>
                          <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                            {member.story}
                          </p>
                        </div>
                      )}
                      
                      {member.weeklyGoal && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">한주 목표</p>
                          <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                            {member.weeklyGoal}
                          </p>
                        </div>
                      )}
                      
                      {member.prayerRequests.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">기도제목</p>
                          <ul className="space-y-1">
                            {member.prayerRequests.map((prayer, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-2 text-slate-700 dark:text-slate-200 leading-relaxed"
                              >
                                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                                {prayer}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {selectedMembers.length === 0 && (
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
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
