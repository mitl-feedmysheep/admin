"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Loader2,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Droplets,
  Brain,
  User,
  FileText,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MemberGroup {
  groupId: string;
  groupName: string;
  role: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  sex: string;
  birthday: string;
  address: string;
  occupation: string;
  baptismStatus: string;
  mbti: string;
  description: string;
  profileUrl: string;
  primaryGroup: string;
  role: string;
  groups: MemberGroup[];
}

export function MembersClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const searchMembers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setMembers([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/members?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      if (json.success) {
        setMembers(json.data.members);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearch = () => {
    searchMembers(searchQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          교적부
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          전체 멤버를 검색하고 관리할 수 있습니다
        </p>
      </div>

      {/* Search */}
      <div className="flex gap-2 max-w-lg">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="이름, 이메일, 전화번호로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10"
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={isLoading || !searchQuery.trim()}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "검색"}
        </Button>
      </div>

      {/* 로딩 */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      )}

      {/* 검색 전 */}
      {!isLoading && !hasSearched && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Search className="mb-4 h-12 w-12" />
          <p>검색어를 입력하고 검색 버튼을 눌러주세요</p>
        </div>
      )}

      {/* 검색 결과 없음 */}
      {!isLoading && hasSearched && members.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <p>검색 결과가 없습니다</p>
        </div>
      )}

      {/* 검색 결과 - 카드 */}
      {!isLoading && hasSearched && members.length > 0 && (
        <>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            검색 결과: {members.length}명
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {members.map((member) => (
              <Card
                key={member.id}
                className="border-slate-200 dark:border-slate-800"
              >
                {/* 이름 / 성별 / 생년월일 */}
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                      <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="flex items-center gap-2 text-base text-slate-900 dark:text-white">
                        {member.name}
                        {member.sex && (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              member.sex === "M"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                : "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
                            }`}
                          >
                            {member.sex === "M" ? "남" : "여"}
                          </span>
                        )}
                      </CardTitle>
                      {member.birthday && (
                        <CardDescription>
                          {member.birthday.replace(/-/g, ".")}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-sm">
                  {/* 소속 그룹 (그룹명 + 역할) */}
                  {member.groups && member.groups.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {member.groups.map((g) => (
                        <Badge
                          key={g.groupId}
                          variant="outline"
                          className={
                            g.role === "LEADER"
                              ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                              : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }
                        >
                          {g.groupName}
                          <span className="ml-1 opacity-60">
                            {g.role === "LEADER" ? "리더" : "멤버"}
                          </span>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* 연락처 + 주소 */}
                  <div className="space-y-1.5 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                    <InfoItem icon={Phone} value={formatPhone(member.phone)} />
                    <InfoItem icon={Mail} value={member.email} />
                    {member.address && (
                      <div className="flex items-start gap-1.5 min-w-0">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="text-slate-600 dark:text-slate-300 leading-relaxed">
                          {member.address}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 상세 정보 - 2열 */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-slate-100 pt-2.5 dark:border-slate-800">
                    <InfoItem icon={Briefcase} label="직업" value={member.occupation} />
                    <InfoItem icon={Droplets} label="세례" value={formatBaptism(member.baptismStatus)} />
                    <InfoItem icon={Brain} label="MBTI" value={member.mbti} />
                    <InfoItem icon={FileText} label="설명" value={member.description} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** 전화번호 포맷: 01088831954 → 010-8883-1954 */
function formatPhone(raw: string): string {
  if (!raw) return "-";
  // 이미 - 가 들어있으면 그대로
  if (raw.includes("-")) return raw;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  // 그 외(국번 등)
  return raw;
}

/** 세례 상태 한글 변환 */
function formatBaptism(status: string): string {
  switch (status) {
    case "BAPTIZED":
      return "세례";
    case "NOT_BAPTIZED":
      return "미세례";
    case "PAEDOBAPTISM":
      return "유아세례";
    default:
      return status || "-";
  }
}

function InfoItem({
  icon: Icon,
  label,
  value,
  placeholder = "-",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label?: string;
  value: string;
  placeholder?: string;
}) {
  const display = value || placeholder;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 min-w-0 cursor-default">
          <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          {label && (
            <span className="shrink-0 text-xs text-slate-400">{label}</span>
          )}
          <span className="truncate text-slate-600 dark:text-slate-300">
            {display}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {display}
      </TooltipContent>
    </Tooltip>
  );
}
