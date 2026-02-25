"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UsersRound, UserCog, Plus, Check, Search, UserMinus, X, Loader2, Trash2, CalendarIcon, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog, ConfirmDialogVariant } from "@/components/confirm-dialog";

// 소그룹 타입
interface Group {
  id: string;
  name: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  memberCount: number;
  leaderName: string;
  leaderId: string;
  createdAt: string;
}

export function GroupManageClient() {
  // 공통 다이얼로그 상태
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    title: string;
    description: string;
    mode: "confirm" | "alert";
    variant: ConfirmDialogVariant;
    confirmText?: string;
    onConfirm?: () => void;
  }>({
    open: false,
    title: "",
    description: "",
    mode: "alert",
    variant: "info",
  });

  const showAlert = (title: string, description: string, variant: ConfirmDialogVariant = "info") => {
    setDialogState({ open: true, title, description, mode: "alert", variant });
  };

  // 하위 탭 상태
  const [groupSubTab, setGroupSubTab] = useState("create-group");

  // 소그룹 생성 폼 상태
  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    type: "NORMAL" as "NORMAL" | "NEWCOMER",
    educationName: "",
    educationDescription: "",
    educationTotalWeeks: "",
  });

  // 소그룹 목록 상태
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupYearFilter, setGroupYearFilter] = useState(String(new Date().getFullYear()));
  const [groupCreateMessage, setGroupCreateMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [groupDeleteDialogOpen, setGroupDeleteDialogOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [isSavingGroupName, setIsSavingGroupName] = useState(false);

  // 멤버 할당 상태
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; sex: string; birthday: string; phone: string; primaryGroup: string; role: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<{ id: string; name: string; sex: string; birthday: string; phone: string; primaryGroup: string }[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedRole, setSelectedRole] = useState("MEMBER");
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 멤버 제외용 상태
  const [removeGroupFilter, setRemoveGroupFilter] = useState("");
  const [membersInSelectedGroup, setMembersInSelectedGroup] = useState<
    { groupMemberId: string; memberId: string; name: string; sex: string; phone: string; birthday: string; role: string }[]
  >([]);
  const [removeGroupLoading, setRemoveGroupLoading] = useState(false);
  const [memberRemoveDialogOpen, setMemberRemoveDialogOpen] = useState(false);

  // 멤버 검색 (API 호출, 디바운스)
  useEffect(() => {
    if (!memberSearchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/members?q=${encodeURIComponent(memberSearchQuery.trim())}`);
        const data = await res.json();
        if (res.ok && data.success) {
          setSearchResults(data.data.members);
        }
      } catch {
        console.error("멤버 검색 실패");
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [memberSearchQuery]);

  // 소그룹 멤버 목록 불러오기
  const fetchGroupMembers = useCallback(async (groupId: string) => {
    if (!groupId) {
      setMembersInSelectedGroup([]);
      return;
    }
    setRemoveGroupLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setMembersInSelectedGroup(data.data.members);
      } else {
        setMembersInSelectedGroup([]);
      }
    } catch {
      console.error("소그룹 멤버 조회 실패");
      setMembersInSelectedGroup([]);
    } finally {
      setRemoveGroupLoading(false);
    }
  }, []);

  useEffect(() => {
    if (removeGroupFilter) {
      fetchGroupMembers(removeGroupFilter);
    } else {
      setMembersInSelectedGroup([]);
    }
  }, [removeGroupFilter, fetchGroupMembers]);

  // 소그룹 목록 불러오기
  const fetchGroups = useCallback(async (year?: string) => {
    setGroupsLoading(true);
    try {
      const params = year ? `?year=${year}` : "";
      const res = await fetch(`/api/groups${params}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setGroups(data.data.groups);
      }
    } catch {
      console.error("소그룹 목록 불러오기 실패");
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups(groupYearFilter);
  }, [fetchGroups, groupYearFilter]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.name.trim() || isCreatingGroup) return;

    setIsCreatingGroup(true);
    setGroupCreateMessage(null);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupForm.name,
          description: groupForm.description || undefined,
          startDate: groupForm.startDate ? dateToApi(groupForm.startDate) : undefined,
          endDate: groupForm.endDate ? dateToApi(groupForm.endDate) : undefined,
          type: groupForm.type,
          ...(groupForm.type === "NEWCOMER" && groupForm.educationTotalWeeks ? {
            educationProgram: {
              name: groupForm.educationName || `${groupForm.name} 교육`,
              description: groupForm.educationDescription || undefined,
              totalWeeks: parseInt(groupForm.educationTotalWeeks),
            },
          } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGroupCreateMessage({ type: "error", text: data.error || "소그룹 생성에 실패했습니다." });
        return;
      }

      setGroupCreateMessage({ type: "success", text: `"${data.data.name}" 소그룹이 생성되었습니다.` });
      setGroupForm({ name: "", description: "", startDate: "", endDate: "", type: "NORMAL", educationName: "", educationDescription: "", educationTotalWeeks: "" });
      fetchGroups(groupYearFilter);
    } catch {
      setGroupCreateMessage({ type: "error", text: "소그룹 생성 중 오류가 발생했습니다." });
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleSaveGroupName = async (groupId: string) => {
    if (!editingGroupName.trim() || isSavingGroupName) return;

    setIsSavingGroupName(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingGroupName }),
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert("이름 변경 실패", data.error || "이름 변경에 실패했습니다.", "danger");
        return;
      }

      setEditingGroupId(null);
      setEditingGroupName("");
      fetchGroups(groupYearFilter);
    } catch {
      showAlert("오류", "이름 변경 중 오류가 발생했습니다.", "danger");
    } finally {
      setIsSavingGroupName(false);
    }
  };

  const handleSelectMember = (member: { id: string; name: string; sex: string; birthday: string; phone: string; primaryGroup: string }) => {
    if (selectedMembers.some((m) => m.id === member.id)) return;
    setSelectedMembers((prev) => [...prev, member]);
    setMemberSearchQuery("");
    setSearchResults([]);
  };

  const handleRemoveSelectedMember = (memberId: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  const handleAssignMembers = async () => {
    if (selectedMembers.length === 0 || !selectedGroup || !selectedRole) return;

    setIsAssigning(true);
    setAssignMessage(null);
    try {
      const res = await fetch(`/api/groups/${selectedGroup}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberIds: selectedMembers.map((m) => m.id),
          role: selectedRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAssignMessage({ type: "error", text: data.error || "멤버 할당에 실패했습니다." });
        return;
      }

      const msg = data.data.skippedCount > 0
        ? `${data.data.assignedCount}명 할당 완료 (${data.data.skippedCount}명은 이미 소속)`
        : `${data.data.assignedCount}명 할당 완료`;
      setAssignMessage({ type: "success", text: msg });
      setSelectedMembers([]);
      fetchGroups(groupYearFilter);
    } catch {
      setAssignMessage({ type: "error", text: "멤버 할당 중 오류가 발생했습니다." });
    } finally {
      setIsAssigning(false);
    }
  };

  const formatDateInput = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, "");
    const limited = numbers.slice(0, 8);
    if (limited.length <= 4) return limited;
    if (limited.length <= 6) return `${limited.slice(0, 4)}/${limited.slice(4)}`;
    return `${limited.slice(0, 4)}/${limited.slice(4, 6)}/${limited.slice(6)}`;
  };

  const dateToApi = (value: string) => value.replaceAll("/", "-");

  const formatBirthday = (birthday: string) => {
    const date = new Date(birthday);
    return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">소그룹 관리</h1>
        <p className="text-slate-500 dark:text-slate-400">
          소그룹 생성 및 멤버를 관리합니다
        </p>
      </div>

      <Tabs value={groupSubTab} onValueChange={setGroupSubTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger
            value="create-group"
            className="gap-2 transition-all hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <UsersRound className="h-4 w-4" />
            소그룹 생성
          </TabsTrigger>
          <TabsTrigger
            value="assign-member"
            className="gap-2 transition-all hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <UserCog className="h-4 w-4" />
            멤버 할당
          </TabsTrigger>
        </TabsList>

        {/* 소그룹 생성 */}
        <TabsContent value="create-group" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">새 소그룹 생성</CardTitle>
                <CardDescription>새로운 소그룹(셀)을 생성합니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateGroup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="groupName">소그룹 이름 *</Label>
                    <Input id="groupName" value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} placeholder="예: 홍길동 셀" required />
                  </div>
                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">시작일 *</Label>
                      <div className="relative">
                        <Input id="startDate" value={groupForm.startDate} onChange={(e) => setGroupForm({ ...groupForm, startDate: formatDateInput(e.target.value) })} placeholder="YYYY/MM/DD" maxLength={10} className="pr-10" required />
                        <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" onClick={() => (document.getElementById("startDate-picker") as HTMLInputElement)?.showPicker()}>
                          <CalendarIcon className="h-4 w-4" />
                        </button>
                        <input id="startDate-picker" type="date" className="invisible absolute inset-0 h-0 w-0" value={groupForm.startDate ? dateToApi(groupForm.startDate) : ""} onChange={(e) => { if (e.target.value) setGroupForm({ ...groupForm, startDate: e.target.value.replaceAll("-", "/") }); }} tabIndex={-1} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">종료일</Label>
                      <div className="relative">
                        <Input id="endDate" value={groupForm.endDate} onChange={(e) => setGroupForm({ ...groupForm, endDate: formatDateInput(e.target.value) })} placeholder="YYYY/MM/DD" maxLength={10} className="pr-10" />
                        <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" onClick={() => (document.getElementById("endDate-picker") as HTMLInputElement)?.showPicker()}>
                          <CalendarIcon className="h-4 w-4" />
                        </button>
                        <input id="endDate-picker" type="date" className="invisible absolute inset-0 h-0 w-0" value={groupForm.endDate ? dateToApi(groupForm.endDate) : ""} onChange={(e) => { if (e.target.value) setGroupForm({ ...groupForm, endDate: e.target.value.replaceAll("-", "/") }); }} tabIndex={-1} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="groupType">소그룹 타입</Label>
                    <Select value={groupForm.type} onValueChange={(v) => setGroupForm({ ...groupForm, type: v as "NORMAL" | "NEWCOMER" })}>
                      <SelectTrigger id="groupType"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NORMAL">일반 소그룹</SelectItem>
                        <SelectItem value="NEWCOMER">새가족부</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="groupDescription">설명</Label>
                    <Textarea id="groupDescription" value={groupForm.description} onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })} placeholder="소그룹에 대한 설명을 입력하세요" className="min-h-[80px]" />
                  </div>
                  {groupForm.type === "NEWCOMER" && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20 space-y-3">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">교육 프로그램 설정</p>
                      <div className="space-y-2">
                        <Label htmlFor="educationName">교육 이름</Label>
                        <Input id="educationName" value={groupForm.educationName} onChange={(e) => setGroupForm({ ...groupForm, educationName: e.target.value })} placeholder="예: 새가족 교육" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="educationDescription">교육 설명</Label>
                        <Input id="educationDescription" value={groupForm.educationDescription} onChange={(e) => setGroupForm({ ...groupForm, educationDescription: e.target.value })} placeholder="예: 12주 과정 새가족 교육 프로그램" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="educationWeeks">총 주차 수 *</Label>
                        <Input id="educationWeeks" type="number" min="1" value={groupForm.educationTotalWeeks} onChange={(e) => setGroupForm({ ...groupForm, educationTotalWeeks: e.target.value })} placeholder="예: 12" />
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <Button type="submit" className="gap-2 bg-slate-800 hover:bg-slate-700" disabled={isCreatingGroup || !groupForm.name.trim()}>
                      {isCreatingGroup ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {isCreatingGroup ? "생성 중..." : "소그룹 생성"}
                    </Button>
                  </div>
                  {groupCreateMessage && (
                    <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${groupCreateMessage.type === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"}`}>
                      {groupCreateMessage.text}
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-slate-900 dark:text-white">소그룹 목록</CardTitle>
                    <CardDescription>{groupYearFilter}년 소그룹 ({groups.length}개)</CardDescription>
                  </div>
                  <Select value={groupYearFilter} onValueChange={setGroupYearFilter}>
                    <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: new Date().getFullYear() - 2025 + 1 }, (_, i) => {
                        const y = String(new Date().getFullYear() - i);
                        return <SelectItem key={y} value={y}>{y}년</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {groupsLoading ? (
                  <div className="py-8 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                    <p className="mt-2 text-sm text-slate-500">불러오는 중...</p>
                  </div>
                ) : groups.length === 0 ? (
                  <div className="py-8 text-center">
                    <UsersRound className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm text-slate-500">등록된 소그룹이 없습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {groups.map((group) => (
                      <div key={group.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                          {editingGroupId === group.id ? (
                            <div className="flex items-center gap-1.5 flex-1 mr-2">
                              <Input value={editingGroupName} onChange={(e) => setEditingGroupName(e.target.value)} className="h-8 text-sm" autoFocus onKeyDown={(e) => { if (e.key === "Enter") handleSaveGroupName(group.id); if (e.key === "Escape") { setEditingGroupId(null); setEditingGroupName(""); } }} disabled={isSavingGroupName} />
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" onClick={() => handleSaveGroupName(group.id)} disabled={isSavingGroupName || !editingGroupName.trim()}>
                                {isSavingGroupName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => { setEditingGroupId(null); setEditingGroupName(""); }} disabled={isSavingGroupName}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <p className="font-medium text-slate-900 dark:text-white">{group.name}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-slate-500">{group.memberCount}명</Badge>
                            {editingGroupId !== group.id && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => { setEditingGroupId(group.id); setEditingGroupName(group.name); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setGroupDeleteDialogOpen(true)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        {group.leaderName && <p className="text-sm text-slate-500 mt-1">리더: {group.leaderName}</p>}
                        <p className="text-xs text-slate-400 mt-1">
                          {group.startDate ? group.startDate.replaceAll("-", "/") : "미정"} ~ {group.endDate ? group.endDate.replaceAll("-", "/") : "진행중"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 멤버 할당 */}
        <TabsContent value="assign-member" className="mt-6">
          <div className="space-y-6">
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCog className="h-5 w-5" />
                  소그룹 멤버 할당
                </CardTitle>
                <CardDescription>멤버를 검색하여 소그룹에 할당하고 역할을 부여합니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>멤버 검색</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input placeholder="이름, 전화번호, 이메일로 검색..." value={memberSearchQuery} onChange={(e) => setMemberSearchQuery(e.target.value)} className="pl-10" />
                      {isSearching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />}
                      {searchResults.length > 0 && memberSearchQuery.trim() && (
                        <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800 max-h-60 overflow-auto">
                          {searchResults.map((member) => {
                            const alreadySelected = selectedMembers.some((m) => m.id === member.id);
                            return (
                              <button key={member.id} type="button" onClick={() => handleSelectMember(member)} disabled={alreadySelected} className={`flex w-full items-center gap-3 px-4 py-3 text-left first:rounded-t-md last:rounded-b-md ${alreadySelected ? "opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-600 text-sm font-medium">{member.name.charAt(0)}</div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-900 dark:text-white">{member.name}</p>
                                  <p className="text-xs text-slate-500 truncate">{member.sex === "M" ? "남" : "여"} · {formatBirthday(member.birthday)} · {member.phone}</p>
                                </div>
                                {member.primaryGroup && <Badge variant="outline" className="text-xs shrink-0">{member.primaryGroup}</Badge>}
                                {alreadySelected && <Check className="h-4 w-4 text-emerald-500 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedMembers.length > 0 && (
                    <div className="space-y-2">
                      <Label>선택된 멤버 ({selectedMembers.length}명)</Label>
                      <div className="flex flex-wrap gap-2">
                        {selectedMembers.map((member) => (
                          <div key={member.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-600 text-xs font-medium">{member.name.charAt(0)}</div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{member.name}</p>
                              <p className="text-xs text-slate-500">{member.phone}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-500" onClick={() => handleRemoveSelectedMember(member.id)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>소그룹 선택 *</Label>
                      <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                        <SelectTrigger><SelectValue placeholder="소그룹을 선택하세요" /></SelectTrigger>
                        <SelectContent>
                          {groups.map((group) => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>역할 선택 *</Label>
                      <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MEMBER">일반멤버</SelectItem>
                          <SelectItem value="SUB_LEADER">서브리더</SelectItem>
                          <SelectItem value="LEADER">리더</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleAssignMembers} className="w-full gap-2 bg-slate-800 hover:bg-slate-700" disabled={selectedMembers.length === 0 || !selectedGroup || !selectedRole || isAssigning}>
                        {isAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCog className="h-4 w-4" />}
                        {isAssigning ? "할당 중..." : `멤버 할당 (${selectedMembers.length}명)`}
                      </Button>
                    </div>
                  </div>

                  {assignMessage && (
                    <div className={`rounded-lg px-4 py-3 text-sm ${assignMessage.type === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"}`}>
                      {assignMessage.text}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                  <UserMinus className="h-5 w-5" />
                  소그룹 멤버 제외
                </CardTitle>
                <CardDescription>소그룹에서 멤버를 제외합니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>소그룹 선택</Label>
                    <Select value={removeGroupFilter} onValueChange={setRemoveGroupFilter}>
                      <SelectTrigger className="max-w-sm"><SelectValue placeholder="소그룹을 선택하세요" /></SelectTrigger>
                      <SelectContent>
                        {groups.map((group) => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {removeGroupFilter && (
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {groups.find(g => g.id === removeGroupFilter)?.name} 멤버 ({membersInSelectedGroup.length}명)
                        </p>
                      </div>
                      {removeGroupLoading ? (
                        <div className="p-6 text-center text-slate-500">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                          멤버 목록을 불러오는 중...
                        </div>
                      ) : membersInSelectedGroup.length === 0 ? (
                        <div className="p-6 text-center text-slate-500">해당 소그룹에 멤버가 없습니다.</div>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                          {membersInSelectedGroup.map((member) => (
                            <div key={member.groupMemberId} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-sm font-medium">{member.name.charAt(0)}</div>
                                <div>
                                  <p className="font-medium text-slate-900 dark:text-white text-sm">{member.name}</p>
                                  <p className="text-xs text-slate-500">{member.sex === "MALE" ? "남" : "여"} · {member.phone || "-"}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={member.role === "LEADER" ? "bg-slate-800 text-white" : member.role === "SUB_LEADER" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}>
                                  {member.role === "LEADER" ? "리더" : member.role === "SUB_LEADER" ? "서브리더" : "멤버"}
                                </Badge>
                                <Button variant="ghost" size="sm" onClick={() => setMemberRemoveDialogOpen(true)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                                  <UserMinus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 소그룹 삭제 안내 다이얼로그 */}
      <Dialog open={groupDeleteDialogOpen} onOpenChange={setGroupDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>소그룹 삭제</DialogTitle>
            <DialogDescription>소그룹 삭제는 직접 처리할 수 없습니다.</DialogDescription>
          </DialogHeader>
          <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <p>관리자에게 문의해주세요.</p>
            <p className="text-slate-500">kcs19542001@gmail.com</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setGroupDeleteDialogOpen(false)}>확인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 소그룹 멤버 제외 안내 다이얼로그 */}
      <Dialog open={memberRemoveDialogOpen} onOpenChange={setMemberRemoveDialogOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>멤버 제외</DialogTitle>
            <DialogDescription>멤버 제외는 직접 처리할 수 없습니다.</DialogDescription>
          </DialogHeader>
          <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <p>관리자에게 문의해주세요.</p>
            <p className="text-slate-500">kcs19542001@gmail.com</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setMemberRemoveDialogOpen(false)}>확인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((prev) => ({ ...prev, open }))}
        title={dialogState.title}
        description={dialogState.description}
        mode={dialogState.mode}
        variant={dialogState.variant}
        confirmText={dialogState.confirmText}
        onConfirm={dialogState.onConfirm}
      />
    </div>
  );
}
