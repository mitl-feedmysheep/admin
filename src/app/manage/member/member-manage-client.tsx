"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, KeyRound, UserPen } from "lucide-react";

interface SearchedMember {
  memberId: string;
  name: string;
  email: string;
  phone?: string;
}

interface MemberDetail {
  id: string;
  name: string;
  email: string;
  sex: string;
  birthday: string;
  phone: string;
  address: string;
  occupation: string;
  baptismStatus: string;
  mbti: string;
  description: string;
}

export function MemberManageClient() {
  const [activeTab, setActiveTab] = useState("edit-member");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">멤버 관리</h1>
        <p className="text-slate-500 dark:text-slate-400">
          멤버 계정을 관리합니다
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-[500px]">
          <TabsTrigger
            value="edit-member"
            className="gap-2 transition-all hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <UserPen className="h-4 w-4" />
            유저 정보 수정
          </TabsTrigger>
          <TabsTrigger
            value="reset-password"
            className="gap-2 transition-all hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <KeyRound className="h-4 w-4" />
            비밀번호 초기화
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit-member" className="mt-6">
          <EditMemberInfoTab />
        </TabsContent>

        <TabsContent value="reset-password" className="mt-6">
          <ResetPasswordTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EditMemberInfoTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchedMember[]>([]);
  const [searchError, setSearchError] = useState("");

  const [selectedMember, setSelectedMember] = useState<SearchedMember | null>(null);
  const [memberDetail, setMemberDetail] = useState<MemberDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [sex, setSex] = useState("");
  const [birthday, setBirthday] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [occupation, setOccupation] = useState("");
  const [baptismStatus, setBaptismStatus] = useState("");
  const [mbti, setMbti] = useState("");
  const [description, setDescription] = useState("");

  const populateForm = (detail: MemberDetail) => {
    setName(detail.name);
    setMemberEmail(detail.email);
    setSex(detail.sex);
    setBirthday(detail.birthday);
    setPhone(detail.phone);
    setAddress(detail.address);
    setOccupation(detail.occupation);
    setBaptismStatus(detail.baptismStatus);
    setMbti(detail.mbti);
    setDescription(detail.description);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("이름 또는 전화번호를 입력해주세요.");
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setSelectedMember(null);
    setMemberDetail(null);
    setSearchError("");

    try {
      const res = await fetch(
        `/api/system/search-church-member?q=${encodeURIComponent(searchQuery.trim())}`
      );
      const data = await res.json();

      if (!res.ok) {
        setSearchError(data.error || "검색에 실패했습니다.");
        return;
      }

      setSearchResults(data.members as SearchedMember[]);
    } catch {
      setSearchError("검색 중 오류가 발생했습니다.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectMember = async (member: SearchedMember) => {
    setSelectedMember(member);
    setIsLoadingDetail(true);
    setSearchError("");

    try {
      const detailRes = await fetch(`/api/members/${member.memberId}`);
      const detailData = await detailRes.json();

      if (!detailRes.ok) {
        setSearchError(detailData.error || "멤버 상세 정보를 불러오지 못했습니다.");
        return;
      }

      const detail = detailData.data as MemberDetail;
      setMemberDetail(detail);
      populateForm(detail);
    } catch {
      setSearchError("멤버 상세 정보를 불러오지 못했습니다.");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleSave = async () => {
    if (!memberDetail) return;

    if (!name.trim() || !memberEmail.trim() || !sex || !birthday || !phone.trim()) {
      toast.error("필수 항목을 모두 입력해주세요.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/system/update-member", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetMemberId: memberDetail.id,
          name: name.trim(),
          email: memberEmail.trim(),
          sex,
          birthday,
          phone: phone.trim(),
          address: address.trim() || null,
          occupation: occupation.trim() || null,
          baptismStatus: baptismStatus || null,
          mbti: mbti.trim() || null,
          description: description.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "저장에 실패했습니다.");
        return;
      }

      toast.success("멤버 정보가 수정되었습니다.");
    } catch {
      toast.error("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
      <CardHeader>
        <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
          <UserPen className="h-5 w-5" />
          유저 정보 수정
        </CardTitle>
        <CardDescription>멤버의 기본 정보를 수정합니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* 이름/전화번호 검색 */}
          <div className="space-y-2 max-w-lg">
            <Label>이름 또는 전화번호로 검색</Label>
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="이름 또는 전화번호"
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

            {/* 검색 결과 목록 */}
            {searchResults.length > 0 && !memberDetail && (
              <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
                {searchResults.map((m) => (
                  <button
                    key={m.memberId}
                    type="button"
                    onClick={() => handleSelectMember(m)}
                    disabled={isLoadingDetail}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
                  >
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{m.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {m.phone}{m.email ? ` · ${m.email}` : ""}
                      </p>
                    </div>
                    {isLoadingDetail && selectedMember?.memberId === m.memberId && (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* 선택된 멤버 표시 */}
            {memberDetail && selectedMember && (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {selectedMember.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedMember.phone}{selectedMember.email ? ` · ${selectedMember.email}` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedMember(null);
                    setMemberDetail(null);
                    setSearchResults([]);
                  }}
                  className="text-xs text-slate-500"
                >
                  다시 검색
                </Button>
              </div>
            )}
          </div>

          {/* 수정 폼 */}
          {memberDetail && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 [&>*]:min-w-0">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">이름 *</Label>
                  <Input
                    id="edit-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={20}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">이메일 *</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-sex">성별 *</Label>
                  <Select value={sex} onValueChange={setSex}>
                    <SelectTrigger id="edit-sex">
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">남성</SelectItem>
                      <SelectItem value="F">여성</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">전화번호 *</Label>
                  <Input
                    id="edit-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={20}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-occupation">직업</Label>
                  <Input
                    id="edit-occupation"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-baptism">세례 여부</Label>
                  <Select value={baptismStatus} onValueChange={setBaptismStatus}>
                    <SelectTrigger id="edit-baptism">
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BAPTIZED">세례</SelectItem>
                      <SelectItem value="NOT_BAPTIZED">미세례</SelectItem>
                      <SelectItem value="PAEDOBAPTISM">유아세례</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-mbti">MBTI</Label>
                  <Input
                    id="edit-mbti"
                    value={mbti}
                    onChange={(e) => setMbti(e.target.value)}
                    maxLength={4}
                    placeholder="예: INFP"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-birthday">생년월일 *</Label>
                <Input
                  id="edit-birthday"
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-address">주소</Label>
                <Input
                  id="edit-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">특이사항</Label>
                <Input
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPen className="h-4 w-4" />
                  )}
                  {isSaving ? "저장 중..." : "저장"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ResetPasswordTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchedMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<SearchedMember | null>(null);
  const [searchError, setSearchError] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("이름, 이메일 또는 전화번호를 입력해주세요.");
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setSelectedMember(null);
    setSearchError("");
    setNewPassword("");

    try {
      const res = await fetch(
        `/api/system/search-church-member?q=${encodeURIComponent(searchQuery.trim())}`
      );
      const data = await res.json();

      if (!res.ok) {
        setSearchError(data.error || "검색에 실패했습니다.");
        return;
      }

      setSearchResults(data.members as SearchedMember[]);
    } catch {
      setSearchError("검색 중 오류가 발생했습니다.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleReset = async () => {
    if (!selectedMember || !newPassword) {
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
          targetMemberId: selectedMember.memberId,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "비밀번호 초기화에 실패했습니다.");
        return;
      }

      toast.success(`${selectedMember.name}님의 비밀번호가 초기화되었습니다.`);
      setSelectedMember(null);
      setSearchResults([]);
      setSearchQuery("");
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
          {/* 검색 */}
          <div className="space-y-2">
            <Label>이름, 이메일 또는 전화번호로 검색</Label>
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="이름, 이메일 또는 전화번호"
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

            {/* 검색 결과 목록 */}
            {searchResults.length > 0 && !selectedMember && (
              <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
                {searchResults.map((m) => (
                  <button
                    key={m.memberId}
                    type="button"
                    onClick={() => setSelectedMember(m)}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{m.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {m.phone}{m.email ? ` · ${m.email}` : ""}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* 선택된 멤버 */}
            {selectedMember && (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {selectedMember.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedMember.phone}{selectedMember.email ? ` · ${selectedMember.email}` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedMember(null);
                    setNewPassword("");
                  }}
                  className="text-xs text-slate-500"
                >
                  다시 검색
                </Button>
              </div>
            )}
          </div>

          {/* 새 비밀번호 */}
          {selectedMember && (
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
          {selectedMember && (
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

