"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Search, KeyRound } from "lucide-react";

interface SearchedMember {
  memberId: string;
  name: string;
  email: string;
}

export function SystemMemberClient() {
  const [activeTab, setActiveTab] = useState("reset-password");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">멤버 관리</h1>
        <p className="text-slate-500 dark:text-slate-400">
          멤버 계정을 관리합니다
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-1 lg:w-[400px]">
          <TabsTrigger
            value="reset-password"
            className="gap-2 transition-all hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <KeyRound className="h-4 w-4" />
            비밀번호 초기화
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reset-password" className="mt-6">
          <ResetPasswordTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ResetPasswordTab() {
  const [email, setEmail] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchedMember, setSearchedMember] = useState<SearchedMember | null>(null);
  const [searchError, setSearchError] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const handleSearch = async () => {
    if (!email.trim()) {
      toast.error("이메일을 입력해주세요.");
      return;
    }

    setIsSearching(true);
    setSearchedMember(null);
    setSearchError("");

    try {
      const res = await fetch(
        `/api/system/search-church-member?email=${encodeURIComponent(email.trim())}`
      );
      const data = await res.json();

      if (!res.ok) {
        setSearchError(data.error || "검색에 실패했습니다.");
        return;
      }

      setSearchedMember(data.member);
    } catch {
      setSearchError("검색 중 오류가 발생했습니다.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = async () => {
    if (!searchedMember || !newPassword) {
      toast.error("멤버와 새 비밀번호를 입력해주세요.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    setIsResetting(true);
    try {
      const res = await fetch("/api/system/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetMemberId: searchedMember.memberId,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "비밀번호 초기화에 실패했습니다.");
        return;
      }

      toast.success(`${searchedMember.name}님의 비밀번호가 초기화되었습니다.`);
      setSearchedMember(null);
      setEmail("");
      setNewPassword("");
    } catch {
      toast.error("비밀번호 초기화 중 오류가 발생했습니다.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          비밀번호 초기화
        </CardTitle>
        <CardDescription>멤버의 비밀번호를 초기화합니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6 max-w-lg">
          {/* 이메일 검색 */}
          <div className="space-y-2">
            <Label>이메일로 유저 검색</Label>
            <div className="flex gap-2">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSearch}
                disabled={isSearching}
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {searchError && (
              <p className="text-sm text-red-500">{searchError}</p>
            )}

            {searchedMember && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {searchedMember.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {searchedMember.email}
                </p>
              </div>
            )}
          </div>

          {/* 새 비밀번호 */}
          {searchedMember && (
            <div className="space-y-2">
              <Label htmlFor="new-password">새 비밀번호</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="8자 이상"
              />
              {newPassword && newPassword.length < 8 && (
                <p className="text-xs text-red-500">
                  비밀번호는 8자 이상이어야 합니다.
                </p>
              )}
            </div>
          )}

          {/* 초기화 버튼 */}
          {searchedMember && (
            <div className="flex justify-end">
              <Button
                onClick={handleReset}
                disabled={isResetting || !newPassword || newPassword.length < 8}
                className="gap-2 bg-slate-800 hover:bg-slate-700"
              >
                {isResetting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                {isResetting ? "초기화 중..." : "비밀번호 초기화"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
