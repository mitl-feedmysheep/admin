"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserPlus, UsersRound, UserCog, Plus, Copy, Check, UserCheck, Clock, Search, UserMinus, X, Church, Users, Eye, EyeOff, Loader2, Trash2, CalendarIcon, Pencil } from "lucide-react";
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

// 편입 요청 타입
interface JoinRequest {
  id: string;
  memberId: string;
  name: string;
  email: string;
  sex: string;
  birthday: string;
  phone: string;
  requestedAt: string;
}

// 히스토리 타입
interface JoinRequestHistory {
  id: string;
  memberId: string;
  name: string;
  email: string;
  sex: string;
  birthday: string;
  phone: string;
  status: "ACCEPTED" | "DECLINED";
  completedBy: string;
  requestedAt: string;
  completedAt: string;
}

export function ManageClient() {
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

  // 상위 탭 상태
  const [mainTab, setMainTab] = useState("church");
  // 하위 탭 상태
  const [churchSubTab, setChurchSubTab] = useState("join-requests");
  const [groupSubTab, setGroupSubTab] = useState("create-group");
  
  // 계정 생성 폼 상태
  const [accountForm, setAccountForm] = useState({
    name: "",
    email: "",
    password: "",
    sex: "",
    birthday: "",
    phone: "",
    address: "",
    job: "",
    baptized: "",
    mbti: "",
    description: "",
  });
  
  // 계정 생성 완료 상태
  const [accountCreated, setAccountCreated] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  
  // 소그룹 생성 폼 상태
  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
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
  
  // 비밀번호 보이기/숨기기 상태
  const [showPassword, setShowPassword] = useState(false);

  // 편입 요청 상태
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [joinRequestsLoading, setJoinRequestsLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // 편입 히스토리 상태
  const [joinHistory, setJoinHistory] = useState<JoinRequestHistory[]>([]);
  const [joinHistoryLoading, setJoinHistoryLoading] = useState(false);
  const [joinRequestTab, setJoinRequestTab] = useState<"pending" | "history">("pending");
  
  // 멤버 제외용 상태
  const [removeGroupFilter, setRemoveGroupFilter] = useState("");
  const [membersInSelectedGroup, setMembersInSelectedGroup] = useState<
    { groupMemberId: string; memberId: string; name: string; sex: string; phone: string; birthday: string; role: string }[]
  >([]);
  const [removeGroupLoading, setRemoveGroupLoading] = useState(false);

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

  // removeGroupFilter 변경 시 멤버 목록 로드
  useEffect(() => {
    if (removeGroupFilter) {
      fetchGroupMembers(removeGroupFilter);
    } else {
      setMembersInSelectedGroup([]);
    }
  }, [removeGroupFilter, fetchGroupMembers]);

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


  const [isCreating, setIsCreating] = useState(false);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isCreating) return;

    setIsCreating(true);
    try {
      // 저장 시 휴대폰번호에서 하이픈 제거
      const payload = {
        ...accountForm,
        phone: stripPhoneHyphens(accountForm.phone),
      };

      const res = await fetch("/api/manage/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert("계정 생성 실패", data.error || "계정 생성에 실패했습니다.", "danger");
        return;
      }

      // 성공 화면 표시
      setAccountCreated({
        email: accountForm.email,
        password: accountForm.password,
      });
    } catch {
      showAlert("오류", "계정 생성 중 오류가 발생했습니다.", "danger");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyCredentials = async () => {
    if (!accountCreated) return;
    const text = `이메일: ${accountCreated.email}\n비밀번호: ${accountCreated.password}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetAccountForm = () => {
    setAccountCreated(null);
    setCopied(false);
    setAccountForm({
      name: "",
      email: "",
      password: "",
      sex: "",
      birthday: "",
      phone: "",
      address: "",
      job: "",
      baptized: "",
      mbti: "",
      description: "",
    });
  };

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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGroupCreateMessage({ type: "error", text: data.error || "소그룹 생성에 실패했습니다." });
        return;
      }

      setGroupCreateMessage({ type: "success", text: `"${data.data.name}" 소그룹이 생성되었습니다.` });
      setGroupForm({ name: "", description: "", startDate: "", endDate: "" });
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
    // 이미 선택된 멤버면 무시
    if (selectedMembers.some((m) => m.id === member.id)) return;
    setSelectedMembers((prev) => [...prev, member]);
    setMemberSearchQuery("");
    setSearchResults([]);
  };

  const handleRemoveSelectedMember = (memberId: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  const handleAssignMembers = async () => {
    if (selectedMembers.length === 0 || !selectedGroup || !selectedRole) {
      return;
    }

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

  const [memberRemoveDialogOpen, setMemberRemoveDialogOpen] = useState(false);

  // 편입 요청 목록 불러오기
  const fetchJoinRequests = useCallback(async () => {
    setJoinRequestsLoading(true);
    try {
      const res = await fetch("/api/manage/join-requests");
      const data = await res.json();
      if (res.ok && data.success) {
        setJoinRequests(data.data.requests);
      }
    } catch {
      console.error("편입 요청 목록 불러오기 실패");
    } finally {
      setJoinRequestsLoading(false);
    }
  }, []);

  // 히스토리 목록 불러오기
  const fetchJoinHistory = useCallback(async () => {
    setJoinHistoryLoading(true);
    try {
      const res = await fetch("/api/manage/join-requests/history");
      const data = await res.json();
      if (res.ok && data.success) {
        setJoinHistory(data.data.requests);
      }
    } catch {
      console.error("편입 히스토리 불러오기 실패");
    } finally {
      setJoinHistoryLoading(false);
    }
  }, []);

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

  // 컴포넌트 마운트 시 데이터 불러오기
  useEffect(() => {
    fetchJoinRequests();
    fetchJoinHistory();
    fetchGroups(groupYearFilter);
  }, [fetchJoinRequests, fetchJoinHistory, fetchGroups, groupYearFilter]);

  const handleApproveRequest = async (requestId: string) => {
    setApprovingId(requestId);
    try {
      const res = await fetch("/api/manage/join-requests/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      const data = await res.json();

      if (!res.ok) {
        showAlert("승인 실패", data.error || "승인에 실패했습니다.", "danger");
        return;
      }

      // 목록에서 제거 + 히스토리 갱신
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
      fetchJoinHistory();
    } catch {
      showAlert("오류", "승인 처리 중 오류가 발생했습니다.", "danger");
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setRejectingId(requestId);
    try {
      const res = await fetch("/api/manage/join-requests/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      const data = await res.json();

      if (!res.ok) {
        showAlert("거절 실패", data.error || "거절에 실패했습니다.", "danger");
        return;
      }

      // 목록에서 제거 + 히스토리 갱신
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
      fetchJoinHistory();
    } catch {
      showAlert("오류", "거절 처리 중 오류가 발생했습니다.", "danger");
    } finally {
      setRejectingId(null);
    }
  };

  // 휴대폰번호 포맷팅 함수 (자동 하이픈 삽입)
  const formatPhoneNumber = (value: string) => {
    // 숫자만 추출
    const numbers = value.replace(/[^0-9]/g, "");
    
    // 최대 11자리로 제한
    const limited = numbers.slice(0, 11);
    
    // 포맷팅 적용
    if (limited.length <= 3) {
      return limited;
    } else if (limited.length <= 7) {
      return `${limited.slice(0, 3)}-${limited.slice(3)}`;
    } else {
      return `${limited.slice(0, 3)}-${limited.slice(3, 7)}-${limited.slice(7)}`;
    }
  };

  // 날짜 포맷팅 함수 (자동 슬래시 삽입, YYYY/MM/DD)
  const formatDateInput = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, "");
    const limited = numbers.slice(0, 8);

    if (limited.length <= 4) {
      return limited;
    } else if (limited.length <= 6) {
      return `${limited.slice(0, 4)}/${limited.slice(4)}`;
    } else {
      return `${limited.slice(0, 4)}/${limited.slice(4, 6)}/${limited.slice(6)}`;
    }
  };

  // 날짜 표시 → API 전송용 변환 (YYYY/MM/DD → YYYY-MM-DD)
  const dateToApi = (value: string) => {
    return value.replaceAll("/", "-");
  };

  // 휴대폰번호에서 하이픈 제거 (저장용)
  const stripPhoneHyphens = (phone: string) => {
    return phone.replace(/-/g, "");
  };

  // 필수 필드 유효성 검사
  const isFormValid = useMemo(() => {
    return (
      accountForm.name.trim() !== "" &&
      accountForm.email.trim() !== "" &&
      accountForm.password.trim() !== "" &&
      accountForm.sex !== "" &&
      accountForm.birthday !== "" &&
      stripPhoneHyphens(accountForm.phone).length >= 10
    );
  }, [accountForm.name, accountForm.email, accountForm.password, accountForm.sex, accountForm.birthday, accountForm.phone]);

  // 날짜 포맷팅 함수
  const formatBirthday = (birthday: string) => {
    const date = new Date(birthday);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}.${month}.${day}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">관리</h1>
        <p className="text-slate-500 dark:text-slate-400">
          교회와 소그룹을 관리합니다
        </p>
      </div>

      {/* 상위 탭: 교회 관리 / 소그룹 관리 */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-6">
        <div className="border-b-2 border-slate-200 dark:border-slate-700 flex">
          <button
            type="button"
            onClick={() => setMainTab("church")}
            className={`flex items-center gap-2 px-6 py-3 text-base font-medium border-b-2 -mb-[2px] transition-colors ${
              mainTab === "church"
                ? "border-slate-800 text-slate-900 dark:border-slate-200 dark:text-white"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Church className="h-5 w-5" />
            교회 관리
          </button>
          <button
            type="button"
            onClick={() => setMainTab("group")}
            className={`flex items-center gap-2 px-6 py-3 text-base font-medium border-b-2 -mb-[2px] transition-colors ${
              mainTab === "group"
                ? "border-slate-800 text-slate-900 dark:border-slate-200 dark:text-white"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Users className="h-5 w-5" />
            소그룹 관리
          </button>
        </div>

        {/* 교회 관리 탭 */}
        <TabsContent value="church" className="space-y-6">
          {/* 하위 탭 */}
          <Tabs value={churchSubTab} onValueChange={setChurchSubTab}>
            <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
              <TabsTrigger 
                value="join-requests" 
                className="gap-2 transition-all hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <UserCheck className="h-4 w-4" />
                교회 편입 관리
                {joinRequests.length > 0 && (
                  <Badge className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0">
                    {joinRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="create-account" 
                className="gap-2 transition-all hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <UserPlus className="h-4 w-4" />
                계정 생성 및 편입
              </TabsTrigger>
            </TabsList>

            {/* 계정 생성 및 편입 */}
            <TabsContent value="create-account" className="mt-6">
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white">새 계정 생성 및 편입</CardTitle>
                  <CardDescription>
                    새로운 멤버 계정을 생성합니다. 생성된 계정은 자동으로 현재 교회에 편입됩니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {accountCreated ? (
                    // 성공 화면
                    <div className="py-8 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                        <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                        계정이 생성되었습니다!
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 mb-6">
                        아래 정보를 멤버에게 전달해주세요.
                      </p>
                      
                      <div className="mx-auto max-w-sm rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                        <div className="space-y-2 text-left text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-500">이메일</span>
                            <span className="font-medium text-slate-900 dark:text-white">{accountCreated.email}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">비밀번호</span>
                            <span className="font-medium text-slate-900 dark:text-white">{accountCreated.password}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-6 flex justify-center gap-3">
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={handleCopyCredentials}
                        >
                          {copied ? (
                            <>
                              <Check className="h-4 w-4 text-emerald-500" />
                              복사됨
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              복사
                            </>
                          )}
                        </Button>
                        <Button
                          className="gap-2 bg-slate-800 hover:bg-slate-700"
                          onClick={handleResetAccountForm}
                        >
                          <Plus className="h-4 w-4" />
                          새 계정 생성
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // 폼
                    <form onSubmit={handleCreateAccount} className="space-y-6">
                      {/* 기본 정보 */}
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="name">이름 *</Label>
                          <Input
                            id="name"
                            value={accountForm.name}
                            onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                            placeholder="이름을 입력하세요"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">이메일 *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={accountForm.email}
                            onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                            placeholder="이메일을 입력하세요"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">비밀번호 *</Label>
                          <div className="relative">
                            <Input
                              id="password"
                              type={showPassword ? "text" : "password"}
                              value={accountForm.password}
                              onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                              placeholder="비밀번호를 입력하세요"
                              required
                              className="pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                              tabIndex={-1}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sex">성별 <span className="text-red-500">*</span></Label>
                          <Select value={accountForm.sex} onValueChange={(v) => setAccountForm({ ...accountForm, sex: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="성별 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MALE">남성</SelectItem>
                              <SelectItem value="FEMALE">여성</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="birthday">생년월일 <span className="text-red-500">*</span></Label>
                          <Input
                            id="birthday"
                            type="date"
                            value={accountForm.birthday}
                            onChange={(e) => setAccountForm({ ...accountForm, birthday: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">휴대폰번호 <span className="text-red-500">*</span></Label>
                          <Input
                            id="phone"
                            value={accountForm.phone}
                            onChange={(e) => setAccountForm({ ...accountForm, phone: formatPhoneNumber(e.target.value) })}
                            placeholder="010-0000-0000"
                            maxLength={13}
                            required
                          />
                        </div>
                      </div>

                      {/* 추가 정보 (선택사항) */}
                      <div className="pt-2">
                        <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">추가 정보 (선택사항)</p>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="address">주소</Label>
                            <Input
                              id="address"
                              value={accountForm.address}
                              onChange={(e) => setAccountForm({ ...accountForm, address: e.target.value })}
                              placeholder="주소를 입력하세요"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="job">직업</Label>
                            <Input
                              id="job"
                              value={accountForm.job}
                              onChange={(e) => setAccountForm({ ...accountForm, job: e.target.value })}
                              placeholder="직업을 입력하세요"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="baptized">세례여부</Label>
                            <Select value={accountForm.baptized} onValueChange={(v) => setAccountForm({ ...accountForm, baptized: v })}>
                              <SelectTrigger>
                                <SelectValue placeholder="세례여부 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="YES">세례받음</SelectItem>
                                <SelectItem value="NO">미세례</SelectItem>
                                <SelectItem value="INFANT">유아세례</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="mbti">MBTI</Label>
                            <Select value={accountForm.mbti} onValueChange={(v) => setAccountForm({ ...accountForm, mbti: v })}>
                              <SelectTrigger>
                                <SelectValue placeholder="MBTI 선택" />
                              </SelectTrigger>
                              <SelectContent>
                                {["ISTJ", "ISFJ", "INFJ", "INTJ", "ISTP", "ISFP", "INFP", "INTP", 
                                  "ESTP", "ESFP", "ENFP", "ENTP", "ESTJ", "ESFJ", "ENFJ", "ENTJ"].map((type) => (
                                  <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">설명 / 메모</Label>
                        <Textarea
                          id="description"
                          value={accountForm.description}
                          onChange={(e) => setAccountForm({ ...accountForm, description: e.target.value })}
                          placeholder="추가 정보를 입력하세요"
                          className="min-h-[80px]"
                        />
                      </div>

                      <div className="flex justify-end">
                        <Button 
                          type="submit" 
                          className="gap-2 bg-slate-800 hover:bg-slate-700"
                          disabled={!isFormValid || isCreating}
                        >
                          <UserPlus className="h-4 w-4" />
                          {isCreating ? "생성 중..." : "계정 생성 및 편입"}
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 교회 편입 관리 */}
            <TabsContent value="join-requests" className="mt-6">
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white">교회 편입 관리</CardTitle>
                  <CardDescription>
                    교회 편입을 요청한 멤버 목록입니다. 승인하면 교회에 편입됩니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* 현황 / 히스토리 탭 */}
                  <div className="flex gap-1 mb-6 rounded-lg bg-slate-100 p-1 dark:bg-slate-800 w-fit">
                    <button
                      type="button"
                      onClick={() => setJoinRequestTab("pending")}
                      className={`relative px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        joinRequestTab === "pending"
                          ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      대기 중
                      {joinRequests.length > 0 && (
                        <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-xs w-5 h-5">
                          {joinRequests.length}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setJoinRequestTab("history")}
                      className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        joinRequestTab === "history"
                          ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      히스토리
                    </button>
                  </div>

                  {/* 대기 중 탭 */}
                  {joinRequestTab === "pending" && (
                    <>
                      {joinRequestsLoading ? (
                        <div className="py-12 text-center">
                          <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
                          <p className="mt-3 text-slate-500 dark:text-slate-400">
                            불러오는 중...
                          </p>
                        </div>
                      ) : joinRequests.length === 0 ? (
                        <div className="py-12 text-center">
                          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                            <UserCheck className="h-6 w-6 text-slate-400" />
                          </div>
                          <p className="text-slate-500 dark:text-slate-400">
                            대기 중인 편입 요청이 없습니다.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {joinRequests.map((request) => (
                            <div
                              key={request.id}
                              className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-lg font-medium">
                                    {request.name.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold text-slate-900 dark:text-white">{request.name}</p>
                                      <Badge variant="outline" className="text-xs">
                                        {request.sex === "MALE" ? "남성" : "여성"}
                                      </Badge>
                                    </div>
                                    <div className="mt-1.5 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-500">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-slate-400">생년월일</span>
                                        <span>{formatBirthday(request.birthday)}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-slate-400">이메일</span>
                                        <span>{request.email}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-slate-400">휴대폰</span>
                                        <span>{request.phone}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                                        <span className="text-slate-400">{request.requestedAt} 요청</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRejectRequest(request.id)}
                                    disabled={rejectingId === request.id || approvingId === request.id}
                                    className="text-slate-500 hover:text-red-500 hover:border-red-300"
                                  >
                                    {rejectingId === request.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      "거절"
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleApproveRequest(request.id)}
                                    disabled={approvingId === request.id || rejectingId === request.id}
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                  >
                                    {approvingId === request.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      "승인"
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* 히스토리 탭 */}
                  {joinRequestTab === "history" && (
                    <>
                      {joinHistoryLoading ? (
                        <div className="py-12 text-center">
                          <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
                          <p className="mt-3 text-slate-500 dark:text-slate-400">
                            불러오는 중...
                          </p>
                        </div>
                      ) : joinHistory.length === 0 ? (
                        <div className="py-12 text-center">
                          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                            <Clock className="h-6 w-6 text-slate-400" />
                          </div>
                          <p className="text-slate-500 dark:text-slate-400">
                            처리된 편입 요청이 없습니다.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {joinHistory.map((record) => (
                            <div
                              key={record.id}
                              className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-lg font-medium">
                                    {record.name.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold text-slate-900 dark:text-white">{record.name}</p>
                                      <Badge variant="outline" className="text-xs">
                                        {record.sex === "MALE" ? "남성" : "여성"}
                                      </Badge>
                                      {record.status === "ACCEPTED" ? (
                                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">
                                          승인
                                        </Badge>
                                      ) : (
                                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">
                                          거절
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="mt-1.5 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-500">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-slate-400">생년월일</span>
                                        <span>{formatBirthday(record.birthday)}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-slate-400">이메일</span>
                                        <span>{record.email}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-slate-400">요청일</span>
                                        <span>{record.requestedAt}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-slate-400">처리일</span>
                                        <span>{record.completedAt}</span>
                                      </div>
                                    </div>
                                    {record.completedBy && (
                                      <p className="mt-1.5 text-xs text-slate-400">
                                        처리자: {record.completedBy}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* 소그룹 관리 탭 */}
        <TabsContent value="group" className="space-y-6">
          {/* 하위 탭 */}
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
                {/* 소그룹 생성 폼 */}
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-900 dark:text-white">새 소그룹 생성</CardTitle>
                    <CardDescription>
                      새로운 소그룹(셀)을 생성합니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateGroup} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="groupName">소그룹 이름 *</Label>
                        <Input
                          id="groupName"
                          value={groupForm.name}
                          onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                          placeholder="예: 홍길동 셀"
                          required
                        />
                      </div>
                      <div className="grid gap-4 grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="startDate">시작일 *</Label>
                          <div className="relative">
                            <Input
                              id="startDate"
                              value={groupForm.startDate}
                              onChange={(e) => setGroupForm({ ...groupForm, startDate: formatDateInput(e.target.value) })}
                              placeholder="YYYY/MM/DD"
                              maxLength={10}
                              className="pr-10"
                              required
                            />
                            <button
                              type="button"
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                              onClick={() => (document.getElementById("startDate-picker") as HTMLInputElement)?.showPicker()}
                            >
                              <CalendarIcon className="h-4 w-4" />
                            </button>
                            <input
                              id="startDate-picker"
                              type="date"
                              className="invisible absolute inset-0 h-0 w-0"
                              value={groupForm.startDate ? dateToApi(groupForm.startDate) : ""}
                              onChange={(e) => {
                                if (e.target.value) {
                                  setGroupForm({ ...groupForm, startDate: e.target.value.replaceAll("-", "/") });
                                }
                              }}
                              tabIndex={-1}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="endDate">종료일</Label>
                          <div className="relative">
                            <Input
                              id="endDate"
                              value={groupForm.endDate}
                              onChange={(e) => setGroupForm({ ...groupForm, endDate: formatDateInput(e.target.value) })}
                              placeholder="YYYY/MM/DD"
                              maxLength={10}
                              className="pr-10"
                            />
                            <button
                              type="button"
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                              onClick={() => (document.getElementById("endDate-picker") as HTMLInputElement)?.showPicker()}
                            >
                              <CalendarIcon className="h-4 w-4" />
                            </button>
                            <input
                              id="endDate-picker"
                              type="date"
                              className="invisible absolute inset-0 h-0 w-0"
                              value={groupForm.endDate ? dateToApi(groupForm.endDate) : ""}
                              onChange={(e) => {
                                if (e.target.value) {
                                  setGroupForm({ ...groupForm, endDate: e.target.value.replaceAll("-", "/") });
                                }
                              }}
                              tabIndex={-1}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="groupDescription">설명</Label>
                        <Textarea
                          id="groupDescription"
                          value={groupForm.description}
                          onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                          placeholder="소그룹에 대한 설명을 입력하세요"
                          className="min-h-[80px]"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit" className="gap-2 bg-slate-800 hover:bg-slate-700" disabled={isCreatingGroup || !groupForm.name.trim()}>
                          {isCreatingGroup ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                          {isCreatingGroup ? "생성 중..." : "소그룹 생성"}
                        </Button>
                      </div>
                      {groupCreateMessage && (
                        <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${
                          groupCreateMessage.type === "success"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                            : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                        }`}>
                          {groupCreateMessage.text}
                        </div>
                      )}
                    </form>
                  </CardContent>
                </Card>

                {/* 기존 소그룹 목록 */}
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-slate-900 dark:text-white">소그룹 목록</CardTitle>
                        <CardDescription>
                          {groupYearFilter}년 소그룹 ({groups.length}개)
                        </CardDescription>
                      </div>
                      <Select value={groupYearFilter} onValueChange={setGroupYearFilter}>
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: new Date().getFullYear() - 2025 + 1 }, (_, i) => {
                            const y = String(new Date().getFullYear() - i);
                            return (
                              <SelectItem key={y} value={y}>
                                {y}년
                              </SelectItem>
                            );
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
                          <div
                            key={group.id}
                            className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                          >
                            <div className="flex items-center justify-between">
                              {editingGroupId === group.id ? (
                                <div className="flex items-center gap-1.5 flex-1 mr-2">
                                  <Input
                                    value={editingGroupName}
                                    onChange={(e) => setEditingGroupName(e.target.value)}
                                    className="h-8 text-sm"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleSaveGroupName(group.id);
                                      if (e.key === "Escape") { setEditingGroupId(null); setEditingGroupName(""); }
                                    }}
                                    disabled={isSavingGroupName}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                    onClick={() => handleSaveGroupName(group.id)}
                                    disabled={isSavingGroupName || !editingGroupName.trim()}
                                  >
                                    {isSavingGroupName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    onClick={() => { setEditingGroupId(null); setEditingGroupName(""); }}
                                    disabled={isSavingGroupName}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <p className="font-medium text-slate-900 dark:text-white">{group.name}</p>
                              )}
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-slate-500">
                                  {group.memberCount}명
                                </Badge>
                                {editingGroupId !== group.id && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    onClick={() => {
                                      setEditingGroupId(group.id);
                                      setEditingGroupName(group.name);
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  onClick={() => setGroupDeleteDialogOpen(true)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            {group.leaderName && (
                              <p className="text-sm text-slate-500 mt-1">
                                리더: {group.leaderName}
                              </p>
                            )}
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
                {/* 멤버 할당 */}
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                      <UserCog className="h-5 w-5" />
                      소그룹 멤버 할당
                    </CardTitle>
                    <CardDescription>
                      멤버를 검색하여 소그룹에 할당하고 역할을 부여합니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* 멤버 검색 */}
                      <div className="space-y-2">
                        <Label>멤버 검색</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          <Input
                            placeholder="이름, 전화번호, 이메일로 검색..."
                            value={memberSearchQuery}
                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                            className="pl-10"
                          />
                          {isSearching && (
                            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
                          )}
                          {/* 검색 결과 드롭다운 */}
                          {searchResults.length > 0 && memberSearchQuery.trim() && (
                            <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800 max-h-60 overflow-auto">
                              {searchResults.map((member) => {
                                const alreadySelected = selectedMembers.some((m) => m.id === member.id);
                                return (
                                  <button
                                    key={member.id}
                                    type="button"
                                    onClick={() => handleSelectMember(member)}
                                    disabled={alreadySelected}
                                    className={`flex w-full items-center gap-3 px-4 py-3 text-left first:rounded-t-md last:rounded-b-md ${
                                      alreadySelected
                                        ? "opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-800"
                                        : "hover:bg-slate-50 dark:hover:bg-slate-700"
                                    }`}
                                  >
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-600 text-sm font-medium">
                                      {member.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-slate-900 dark:text-white">
                                        {member.name}
                                      </p>
                                      <p className="text-xs text-slate-500 truncate">
                                        {member.sex === "M" ? "남" : "여"} · {formatBirthday(member.birthday)} · {member.phone}
                                      </p>
                                    </div>
                                    {member.primaryGroup && (
                                      <Badge variant="outline" className="text-xs shrink-0">
                                        {member.primaryGroup}
                                      </Badge>
                                    )}
                                    {alreadySelected && (
                                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 선택된 멤버 카드들 */}
                      {selectedMembers.length > 0 && (
                        <div className="space-y-2">
                          <Label>선택된 멤버 ({selectedMembers.length}명)</Label>
                          <div className="flex flex-wrap gap-2">
                            {selectedMembers.map((member) => (
                              <div
                                key={member.id}
                                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                              >
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-600 text-xs font-medium">
                                  {member.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-900 dark:text-white">{member.name}</p>
                                  <p className="text-xs text-slate-500">{member.phone}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-slate-400 hover:text-red-500"
                                  onClick={() => handleRemoveSelectedMember(member.id)}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 소그룹 & 역할 선택 */}
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label>소그룹 선택 *</Label>
                          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                            <SelectTrigger>
                              <SelectValue placeholder="소그룹을 선택하세요" />
                            </SelectTrigger>
                            <SelectContent>
                              {groups.map((group) => (
                                <SelectItem key={group.id} value={group.id}>
                                  {group.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>역할 선택 *</Label>
                          <Select value={selectedRole} onValueChange={setSelectedRole}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MEMBER">일반멤버</SelectItem>
                              <SelectItem value="SUB_LEADER">서브리더</SelectItem>
                              <SelectItem value="LEADER">리더</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end">
                          <Button
                            onClick={handleAssignMembers}
                            className="w-full gap-2 bg-slate-800 hover:bg-slate-700"
                            disabled={selectedMembers.length === 0 || !selectedGroup || !selectedRole || isAssigning}
                          >
                            {isAssigning ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserCog className="h-4 w-4" />
                            )}
                            {isAssigning ? "할당 중..." : `멤버 할당 (${selectedMembers.length}명)`}
                          </Button>
                        </div>
                      </div>

                      {/* 결과 메시지 */}
                      {assignMessage && (
                        <div className={`rounded-lg px-4 py-3 text-sm ${
                          assignMessage.type === "success"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                            : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                        }`}>
                          {assignMessage.text}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 멤버 제외 */}
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                      <UserMinus className="h-5 w-5" />
                      소그룹 멤버 제외
                    </CardTitle>
                    <CardDescription>
                      소그룹에서 멤버를 제외합니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>소그룹 선택</Label>
                        <Select value={removeGroupFilter} onValueChange={setRemoveGroupFilter}>
                          <SelectTrigger className="max-w-sm">
                            <SelectValue placeholder="소그룹을 선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            {groups.map((group) => (
                              <SelectItem key={group.id} value={group.id}>
                                {group.name}
                              </SelectItem>
                            ))}
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
                            <div className="p-6 text-center text-slate-500">
                              해당 소그룹에 멤버가 없습니다.
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                              {membersInSelectedGroup.map((member) => (
                                <div
                                  key={member.groupMemberId}
                                  className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-sm font-medium">
                                      {member.name.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="font-medium text-slate-900 dark:text-white text-sm">
                                        {member.name}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        {member.sex === "MALE" ? "남" : "여"} · {member.phone || "-"}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      className={
                                        member.role === "LEADER"
                                          ? "bg-slate-800 text-white"
                                          : member.role === "SUB_LEADER"
                                          ? "bg-blue-100 text-blue-700"
                                          : "bg-slate-100 text-slate-600"
                                      }
                                    >
                                      {member.role === "LEADER" ? "리더" : member.role === "SUB_LEADER" ? "서브리더" : "멤버"}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setMemberRemoveDialogOpen(true)}
                                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
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
        </TabsContent>
      </Tabs>

      {/* 소그룹 삭제 안내 다이얼로그 */}
      <Dialog open={groupDeleteDialogOpen} onOpenChange={setGroupDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>소그룹 삭제</DialogTitle>
            <DialogDescription>
              소그룹 삭제는 직접 처리할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <p>관리자에게 문의해주세요.</p>
            <p className="text-slate-500">kcs19542001@gmail.com</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setGroupDeleteDialogOpen(false)}>
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 소그룹 멤버 제외 안내 다이얼로그 */}
      <Dialog open={memberRemoveDialogOpen} onOpenChange={setMemberRemoveDialogOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>멤버 제외</DialogTitle>
            <DialogDescription>
              멤버 제외는 직접 처리할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <p>관리자에게 문의해주세요.</p>
            <p className="text-slate-500">kcs19542001@gmail.com</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setMemberRemoveDialogOpen(false)}>
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 공통 확인/알림 다이얼로그 */}
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
