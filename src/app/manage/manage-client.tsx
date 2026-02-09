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
import { UserPlus, UsersRound, UserCog, Plus, Copy, Check, UserCheck, Clock, Search, UserMinus, X, Church, Users, Eye, EyeOff, Loader2 } from "lucide-react";

// Mock 소모임 데이터
const mockGroups = [
  { id: "1", name: "강소정 셀", leaderName: "강소정", memberCount: 8, startDate: "2024-01-01", endDate: null },
  { id: "2", name: "강혜정 셀", leaderName: "강혜정", memberCount: 6, startDate: "2024-03-15", endDate: null },
  { id: "3", name: "김민지 셀", leaderName: "김민지", memberCount: 7, startDate: "2024-06-01", endDate: null },
];

// Mock 멤버 데이터 (성별, 생년월일, 전화번호 추가)
const mockMembers = [
  { id: "1", name: "강소정", email: "kang@example.com", sex: "FEMALE", birthday: "1990-03-15", phone: "010-1234-5678", group: "강소정 셀", role: "LEADER" },
  { id: "2", name: "변재욱", email: "byun@example.com", sex: "MALE", birthday: "1992-07-22", phone: "010-2345-6789", group: "강소정 셀", role: "MEMBER" },
  { id: "3", name: "서현제", email: "seo@example.com", sex: "MALE", birthday: "1988-11-05", phone: "010-3456-7890", group: "강소정 셀", role: "MEMBER" },
  { id: "4", name: "강혜정", email: "khj@example.com", sex: "FEMALE", birthday: "1991-05-10", phone: "010-4567-8901", group: "강혜정 셀", role: "LEADER" },
  { id: "5", name: "박준성", email: "park@example.com", sex: "MALE", birthday: "1995-09-18", phone: "010-5678-9012", group: null, role: null },
  { id: "6", name: "김민지", email: "kim@example.com", sex: "FEMALE", birthday: "1993-01-25", phone: "010-6789-0123", group: "김민지 셀", role: "LEADER" },
  { id: "7", name: "이영희", email: "lee@example.com", sex: "FEMALE", birthday: "1994-12-03", phone: "010-7890-1234", group: null, role: null },
  { id: "8", name: "최민수", email: "choi@example.com", sex: "MALE", birthday: "1989-04-28", phone: "010-8901-2345", group: "강혜정 셀", role: "MEMBER" },
];

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
  
  // 소모임 생성 폼 상태
  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
  });
  
  // 멤버 할당 상태
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<typeof mockMembers[0] | null>(null);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  
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

  // 멤버 검색 결과
  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return [];
    const query = memberSearchQuery.toLowerCase();
    return mockMembers.filter(
      (member) =>
        member.name.toLowerCase().includes(query) ||
        member.phone.includes(query) ||
        member.email.toLowerCase().includes(query)
    ).slice(0, 5); // 최대 5명까지만 표시
  }, [memberSearchQuery]);

  // 소모임별 멤버 필터링 (제외용)
  const membersInSelectedGroup = useMemo(() => {
    if (!removeGroupFilter) return [];
    return mockMembers.filter((member) => {
      const group = mockGroups.find(g => g.id === removeGroupFilter);
      return group && member.group === group.name;
    });
  }, [removeGroupFilter]);

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
        alert(data.error || "계정 생성에 실패했습니다.");
        return;
      }

      // 성공 화면 표시
      setAccountCreated({
        email: accountForm.email,
        password: accountForm.password,
      });
    } catch {
      alert("계정 생성 중 오류가 발생했습니다.");
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

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: API 호출
    console.log("Creating group:", groupForm);
    alert("소모임이 생성되었습니다!");
    setGroupForm({ name: "", description: "", startDate: "", endDate: "" });
  };

  const handleSelectMember = (member: typeof mockMembers[0]) => {
    setSelectedMember(member);
    setMemberSearchQuery("");
  };

  const handleClearSelectedMember = () => {
    setSelectedMember(null);
  };

  const handleAssignMember = () => {
    if (!selectedMember || !selectedGroup || !selectedRole) {
      alert("모든 항목을 선택해주세요.");
      return;
    }
    // TODO: API 호출
    console.log("Assigning member:", { selectedMember: selectedMember.id, selectedGroup, selectedRole });
    alert("멤버가 소모임에 할당되었습니다!");
    setSelectedMember(null);
    setSelectedGroup("");
    setSelectedRole("");
  };

  const handleRemoveMember = (memberId: string) => {
    const member = mockMembers.find(m => m.id === memberId);
    if (!member) return;
    
    // TODO: API 호출
    console.log("Removing member from group:", memberId);
    alert(`${member.name}님이 소모임에서 제외되었습니다.`);
  };

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

  // 컴포넌트 마운트 시 편입 요청 목록 불러오기
  useEffect(() => {
    fetchJoinRequests();
    fetchJoinHistory();
  }, [fetchJoinRequests, fetchJoinHistory]);

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
        alert(data.error || "승인에 실패했습니다.");
        return;
      }

      // 목록에서 제거 + 히스토리 갱신
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
      fetchJoinHistory();
    } catch {
      alert("승인 처리 중 오류가 발생했습니다.");
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
        alert(data.error || "거절에 실패했습니다.");
        return;
      }

      // 목록에서 제거 + 히스토리 갱신
      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
      fetchJoinHistory();
    } catch {
      alert("거절 처리 중 오류가 발생했습니다.");
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
          교회와 소모임을 관리합니다
        </p>
      </div>

      {/* 상위 탭: 교회 관리 / 소모임 관리 */}
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
            소모임 관리
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

        {/* 소모임 관리 탭 */}
        <TabsContent value="group" className="space-y-6">
          {/* 하위 탭 */}
          <Tabs value={groupSubTab} onValueChange={setGroupSubTab}>
            <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
              <TabsTrigger 
                value="create-group" 
                className="gap-2 transition-all hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <UsersRound className="h-4 w-4" />
                소모임 생성
              </TabsTrigger>
              <TabsTrigger 
                value="assign-member" 
                className="gap-2 transition-all hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <UserCog className="h-4 w-4" />
                멤버 할당
              </TabsTrigger>
            </TabsList>

            {/* 소모임 생성 */}
            <TabsContent value="create-group" className="mt-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* 소모임 생성 폼 */}
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-900 dark:text-white">새 소모임 생성</CardTitle>
                    <CardDescription>
                      새로운 소모임(셀)을 생성합니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateGroup} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="groupName">소모임 이름 *</Label>
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
                          <Input
                            id="startDate"
                            type="date"
                            value={groupForm.startDate}
                            onChange={(e) => setGroupForm({ ...groupForm, startDate: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="endDate">종료일</Label>
                          <Input
                            id="endDate"
                            type="date"
                            value={groupForm.endDate}
                            onChange={(e) => setGroupForm({ ...groupForm, endDate: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="groupDescription">설명</Label>
                        <Textarea
                          id="groupDescription"
                          value={groupForm.description}
                          onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                          placeholder="소모임에 대한 설명을 입력하세요"
                          className="min-h-[80px]"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit" className="gap-2 bg-slate-800 hover:bg-slate-700">
                          <Plus className="h-4 w-4" />
                          소모임 생성
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* 기존 소모임 목록 */}
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-900 dark:text-white">소모임 목록</CardTitle>
                    <CardDescription>
                      현재 등록된 소모임 ({mockGroups.length}개)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {mockGroups.map((group) => (
                        <div
                          key={group.id}
                          className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-slate-900 dark:text-white">{group.name}</p>
                            <Badge variant="outline" className="text-slate-500">
                              {group.memberCount}명
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-500 mt-1">
                            리더: {group.leaderName}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {group.startDate} ~ {group.endDate || "진행중"}
                          </p>
                        </div>
                      ))}
                    </div>
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
                      소모임 멤버 할당
                    </CardTitle>
                    <CardDescription>
                      멤버를 검색하여 소모임에 할당하고 역할을 부여합니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* 왼쪽: 멤버 검색 및 선택 */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>멤버 검색 *</Label>
                          {selectedMember ? (
                            // 선택된 멤버 표시
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-600 text-lg font-medium">
                                    {selectedMember.name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-900 dark:text-white">
                                      {selectedMember.name}
                                    </p>
                                    <div className="mt-1 space-y-0.5 text-sm text-slate-500">
                                      <p>{selectedMember.sex === "MALE" ? "남성" : "여성"} · {formatBirthday(selectedMember.birthday)}</p>
                                      <p>{selectedMember.phone}</p>
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={handleClearSelectedMember}
                                  className="h-8 w-8 text-slate-400 hover:text-slate-600"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              {selectedMember.group && (
                                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                  <p className="text-xs text-slate-400">현재 소속</p>
                                  <Badge variant="outline" className="mt-1">
                                    {selectedMember.group} ({selectedMember.role === "LEADER" ? "리더" : "멤버"})
                                  </Badge>
                                </div>
                              )}
                            </div>
                          ) : (
                            // 검색 입력
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                              <Input
                                placeholder="이름, 전화번호, 이메일로 검색..."
                                value={memberSearchQuery}
                                onChange={(e) => setMemberSearchQuery(e.target.value)}
                                className="pl-10"
                              />
                              {/* 검색 결과 드롭다운 */}
                              {filteredMembers.length > 0 && (
                                <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                                  {filteredMembers.map((member) => (
                                    <button
                                      key={member.id}
                                      type="button"
                                      onClick={() => handleSelectMember(member)}
                                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 first:rounded-t-md last:rounded-b-md"
                                    >
                                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-600 text-sm font-medium">
                                        {member.name.charAt(0)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-900 dark:text-white">
                                          {member.name}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate">
                                          {member.sex === "MALE" ? "남" : "여"} · {formatBirthday(member.birthday)} · {member.phone}
                                        </p>
                                      </div>
                                      {member.group && (
                                        <Badge variant="outline" className="text-xs">
                                          {member.group}
                                        </Badge>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 오른쪽: 소모임 및 역할 선택 */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>소모임 선택 *</Label>
                          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                            <SelectTrigger>
                              <SelectValue placeholder="소모임을 선택하세요" />
                            </SelectTrigger>
                            <SelectContent>
                              {mockGroups.map((group) => (
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
                              <SelectValue placeholder="역할을 선택하세요" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="LEADER">리더</SelectItem>
                              <SelectItem value="MEMBER">멤버</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end pt-2">
                          <Button 
                            onClick={handleAssignMember} 
                            className="gap-2 bg-slate-800 hover:bg-slate-700"
                            disabled={!selectedMember || !selectedGroup || !selectedRole}
                          >
                            <UserCog className="h-4 w-4" />
                            멤버 할당
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 멤버 제외 */}
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                      <UserMinus className="h-5 w-5" />
                      소모임 멤버 제외
                    </CardTitle>
                    <CardDescription>
                      소모임에서 멤버를 제외합니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>소모임 선택</Label>
                        <Select value={removeGroupFilter} onValueChange={setRemoveGroupFilter}>
                          <SelectTrigger className="max-w-sm">
                            <SelectValue placeholder="소모임을 선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            {mockGroups.map((group) => (
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
                              {mockGroups.find(g => g.id === removeGroupFilter)?.name} 멤버 ({membersInSelectedGroup.length}명)
                            </p>
                          </div>
                          {membersInSelectedGroup.length === 0 ? (
                            <div className="p-6 text-center text-slate-500">
                              해당 소모임에 멤버가 없습니다.
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                              {membersInSelectedGroup.map((member) => (
                                <div
                                  key={member.id}
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
                                        {member.sex === "MALE" ? "남" : "여"} · {member.phone}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      className={
                                        member.role === "LEADER"
                                          ? "bg-slate-800 text-white"
                                          : "bg-slate-100 text-slate-600"
                                      }
                                    >
                                      {member.role === "LEADER" ? "리더" : "멤버"}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveMember(member.id)}
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
    </div>
  );
}
