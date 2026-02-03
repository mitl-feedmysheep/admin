"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, ChevronRight, Loader2 } from "lucide-react";

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
}

export function MembersClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    phone: "",
  });

  // 검색 API 호출
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

  // 엔터키 또는 검색 버튼으로 검색
  const handleSearch = () => {
    searchMembers(searchQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: API 호출
    console.log("Adding member:", newMember);
    setIsDialogOpen(false);
    setNewMember({ name: "", email: "", phone: "" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            교적부
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            전체 멤버를 관리하고 검색할 수 있습니다
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4" />
              멤버 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 멤버 추가</DialogTitle>
              <DialogDescription>
                교적부에 새로운 멤버를 추가합니다
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  value={newMember.name}
                  onChange={(e) =>
                    setNewMember({ ...newMember, name: e.target.value })
                  }
                  placeholder="이름을 입력하세요"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  value={newMember.email}
                  onChange={(e) =>
                    setNewMember({ ...newMember, email: e.target.value })
                  }
                  placeholder="이메일을 입력하세요"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">전화번호</Label>
                <Input
                  id="phone"
                  value={newMember.phone}
                  onChange={(e) =>
                    setNewMember({ ...newMember, phone: e.target.value })
                  }
                  placeholder="010-0000-0000"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  취소
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                  추가
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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

      {/* Members Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white">
            멤버 목록
          </CardTitle>
          <CardDescription>
            {hasSearched ? `검색 결과: ${members.length}명` : "이름, 이메일, 전화번호로 검색해주세요"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 로딩 중 */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          )}

          {/* 검색 전 */}
          {!isLoading && !hasSearched && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Search className="h-12 w-12 mb-4" />
              <p>검색어를 입력하고 검색 버튼을 눌러주세요</p>
            </div>
          )}

          {/* 검색 결과 없음 */}
          {!isLoading && hasSearched && members.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <p>검색 결과가 없습니다</p>
            </div>
          )}

          {/* 검색 결과 */}
          {!isLoading && hasSearched && members.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                      이름
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-slate-500 dark:text-slate-400">
                      성별
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                      생년월일
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                      전화번호
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                      주소
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                      세례여부
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-slate-500 dark:text-slate-400">
                      MBTI
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                      소속 그룹
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                      설명
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400">
                      
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {member.name}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400">
                        {member.sex === "M" ? "남" : member.sex === "F" ? "여" : "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {member.birthday ? member.birthday.replace(/-/g, ".") : "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {member.phone || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-[150px] truncate">
                        {member.address || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {member.baptismStatus || "-"}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400">
                        {member.mbti || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          {member.primaryGroup || "-"}
                          {member.role === "LEADER" && (
                            <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                              리더
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-[150px] truncate">
                        {member.description || "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/members/${member.id}`}>
                          <Button variant="ghost" size="sm">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
