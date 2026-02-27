"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, UserPlus, Church, Shield, KeyRound } from "lucide-react";

interface ChurchItem {
  id: string;
  name: string;
  location: string;
}

interface SearchedMember {
  memberId: string;
  name: string;
  email: string;
}

export function SystemChurchClient() {
  const [activeTab, setActiveTab] = useState("create");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">교회 관리</h1>
        <p className="text-slate-500 dark:text-slate-400">
          교회를 생성하고 관리자를 지정합니다
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger
            value="create"
            className="gap-2 transition-all hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Church className="h-4 w-4" />
            교회 생성
          </TabsTrigger>
          <TabsTrigger
            value="assign"
            className="gap-2 transition-all hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Shield className="h-4 w-4" />
            권한 관리
          </TabsTrigger>
          <TabsTrigger
            value="reset-password"
            className="gap-2 transition-all hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <KeyRound className="h-4 w-4" />
            비밀번호 초기화
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-6">
          <CreateChurchTab />
        </TabsContent>

        <TabsContent value="assign" className="mt-6">
          <AssignAdminTab />
        </TabsContent>

        <TabsContent value="reset-password" className="mt-6">
          <ResetPasswordTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateChurchTab() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [number, setNumber] = useState("");
  const [homepageUrl, setHomepageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !location.trim()) {
      toast.error("교회명과 위치는 필수입니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/system/create-church", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          location: location.trim(),
          number: number.trim() || undefined,
          homepageUrl: homepageUrl.trim() || undefined,
          description: description.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "교회 생성에 실패했습니다.");
        return;
      }

      toast.success(`"${data.church.name}" 교회가 생성되었습니다.`);
      setName("");
      setLocation("");
      setNumber("");
      setHomepageUrl("");
      setDescription("");
    } catch {
      toast.error("교회 생성 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-900 dark:text-white">새 교회 생성</CardTitle>
        <CardDescription>새로운 교회를 등록합니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <Label htmlFor="church-name">교회명 *</Label>
            <Input
              id="church-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 사랑의교회"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="church-location">위치 *</Label>
            <Input
              id="church-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="예: 서울특별시 강남구 ..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="church-number">전화번호</Label>
            <Input
              id="church-number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="예: 02-1234-5678"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="church-homepage">홈페이지</Label>
            <Input
              id="church-homepage"
              value={homepageUrl}
              onChange={(e) => setHomepageUrl(e.target.value)}
              placeholder="예: https://church.example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="church-description">설명</Label>
            <Textarea
              id="church-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="교회에 대한 간단한 설명"
              rows={3}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="gap-2 bg-slate-800 hover:bg-slate-700">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Church className="h-4 w-4" />
              )}
              {isSubmitting ? "생성 중..." : "교회 생성"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function AssignAdminTab() {
  const [churches, setChurches] = useState<ChurchItem[]>([]);
  const [isLoadingChurches, setIsLoadingChurches] = useState(true);
  const [selectedChurchId, setSelectedChurchId] = useState("");

  const [email, setEmail] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchedMember, setSearchedMember] = useState<SearchedMember | null>(null);
  const [searchError, setSearchError] = useState("");

  const [selectedRole, setSelectedRole] = useState("SUPER_ADMIN");
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    loadChurches();
  }, []);

  const loadChurches = async () => {
    setIsLoadingChurches(true);
    try {
      const res = await fetch("/api/system/churches");
      const data = await res.json();
      if (res.ok) {
        setChurches(data.churches || []);
      }
    } catch {
      toast.error("교회 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoadingChurches(false);
    }
  };

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
        `/api/system/search-member?email=${encodeURIComponent(email.trim())}`
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

  const handleAssign = async () => {
    if (!selectedChurchId || !searchedMember) {
      toast.error("교회와 멤버를 선택해주세요.");
      return;
    }

    setIsAssigning(true);
    try {
      const res = await fetch("/api/system/assign-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          churchId: selectedChurchId,
          targetMemberId: searchedMember.memberId,
          role: selectedRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "권한 추가에 실패했습니다.");
        return;
      }

      const churchName = churches.find((c) => c.id === selectedChurchId)?.name;
      toast.success(
        `${searchedMember.name}님을 "${churchName}" 교회의 ${selectedRole}로 추가했습니다.`
      );

      setSearchedMember(null);
      setEmail("");
    } catch {
      toast.error("권한 추가 중 오류가 발생했습니다.");
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
          <Shield className="h-5 w-5" />
          교회 권한 관리
        </CardTitle>
        <CardDescription>교회에 관리자를 지정합니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6 max-w-lg">
          {/* 교회 선택 */}
          <div className="space-y-2">
            <Label>교회 선택</Label>
            {isLoadingChurches ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                불러오는 중...
              </div>
            ) : (
              <Select value={selectedChurchId} onValueChange={setSelectedChurchId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="교회를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {churches.map((church) => (
                    <SelectItem key={church.id} value={church.id}>
                      {church.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

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

          {/* 권한 선택 */}
          {searchedMember && (
            <div className="space-y-2">
              <Label>권한</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="role"
                    value="SUPER_ADMIN"
                    checked={selectedRole === "SUPER_ADMIN"}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="accent-indigo-600"
                  />
                  SUPER_ADMIN (담임목사)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="role"
                    value="ADMIN"
                    checked={selectedRole === "ADMIN"}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="accent-indigo-600"
                  />
                  ADMIN (관리자)
                </label>
              </div>
            </div>
          )}

          {/* 추가 버튼 */}
          {searchedMember && (
            <div className="flex justify-end">
              <Button
                onClick={handleAssign}
                disabled={isAssigning || !selectedChurchId}
                className="gap-2 bg-slate-800 hover:bg-slate-700"
              >
                {isAssigning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {isAssigning ? "추가 중..." : "관리자 추가"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
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
        `/api/system/search-member?email=${encodeURIComponent(email.trim())}`
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
    if (!searchedMember || !newPassword) return;

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
        <CardDescription>전체 유저 대상으로 비밀번호를 초기화합니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6 max-w-lg">
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
