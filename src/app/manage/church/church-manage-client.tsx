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
import { UserPlus, Plus, Copy, Check, UserCheck, Clock, Eye, EyeOff, Loader2 } from "lucide-react";
import { ConfirmDialog, ConfirmDialogVariant } from "@/components/confirm-dialog";

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

export function ChurchManageClient() {
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
  const [churchSubTab, setChurchSubTab] = useState("join-requests");

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

  const [isCreating, setIsCreating] = useState(false);

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

  useEffect(() => {
    fetchJoinRequests();
  }, [fetchJoinRequests]);

  // 히스토리 탭 클릭 시에만 조회
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const handleHistoryTab = () => {
    setJoinRequestTab("history");
    if (!historyLoaded) {
      fetchJoinHistory();
      setHistoryLoaded(true);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isCreating) return;

    setIsCreating(true);
    try {
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

      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
      setHistoryLoaded(false); // 다음에 히스토리 탭 열 때 새로 조회
      if (joinRequestTab === "history") fetchJoinHistory();
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

      setJoinRequests((prev) => prev.filter((r) => r.id !== requestId));
      setHistoryLoaded(false);
      if (joinRequestTab === "history") fetchJoinHistory();
    } catch {
      showAlert("오류", "거절 처리 중 오류가 발생했습니다.", "danger");
    } finally {
      setRejectingId(null);
    }
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, "");
    const limited = numbers.slice(0, 11);
    if (limited.length <= 3) return limited;
    if (limited.length <= 7) return `${limited.slice(0, 3)}-${limited.slice(3)}`;
    return `${limited.slice(0, 3)}-${limited.slice(3, 7)}-${limited.slice(7)}`;
  };

  const stripPhoneHyphens = (phone: string) => phone.replace(/-/g, "");

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

  const formatBirthday = (birthday: string) => {
    const date = new Date(birthday);
    return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">교회 관리</h1>
        <p className="text-slate-500 dark:text-slate-400">
          교회 편입 및 계정을 관리합니다
        </p>
      </div>

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
                    <Button variant="outline" className="gap-2" onClick={handleCopyCredentials}>
                      {copied ? (<><Check className="h-4 w-4 text-emerald-500" />복사됨</>) : (<><Copy className="h-4 w-4" />복사</>)}
                    </Button>
                    <Button className="gap-2 bg-slate-800 hover:bg-slate-700" onClick={handleResetAccountForm}>
                      <Plus className="h-4 w-4" />새 계정 생성
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateAccount} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">이름 *</Label>
                      <Input id="name" value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} placeholder="이름을 입력하세요" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">이메일 *</Label>
                      <Input id="email" type="email" value={accountForm.email} onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })} placeholder="이메일을 입력하세요" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">비밀번호 *</Label>
                      <div className="relative">
                        <Input id="password" type={showPassword ? "text" : "password"} value={accountForm.password} onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })} placeholder="비밀번호를 입력하세요" required className="pr-10" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" tabIndex={-1}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sex">성별 <span className="text-red-500">*</span></Label>
                      <Select value={accountForm.sex} onValueChange={(v) => setAccountForm({ ...accountForm, sex: v })}>
                        <SelectTrigger><SelectValue placeholder="성별 선택" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MALE">남성</SelectItem>
                          <SelectItem value="FEMALE">여성</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birthday">생년월일 <span className="text-red-500">*</span></Label>
                      <Input id="birthday" type="date" value={accountForm.birthday} onChange={(e) => setAccountForm({ ...accountForm, birthday: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">휴대폰번호 <span className="text-red-500">*</span></Label>
                      <Input id="phone" value={accountForm.phone} onChange={(e) => setAccountForm({ ...accountForm, phone: formatPhoneNumber(e.target.value) })} placeholder="010-0000-0000" maxLength={13} required />
                    </div>
                  </div>
                  <div className="pt-2">
                    <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">추가 정보 (선택사항)</p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="address">주소</Label>
                        <Input id="address" value={accountForm.address} onChange={(e) => setAccountForm({ ...accountForm, address: e.target.value })} placeholder="주소를 입력하세요" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="job">직업</Label>
                        <Input id="job" value={accountForm.job} onChange={(e) => setAccountForm({ ...accountForm, job: e.target.value })} placeholder="직업을 입력하세요" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="baptized">세례여부</Label>
                        <Select value={accountForm.baptized} onValueChange={(v) => setAccountForm({ ...accountForm, baptized: v })}>
                          <SelectTrigger><SelectValue placeholder="세례여부 선택" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BAPTIZED">세례받음</SelectItem>
                            <SelectItem value="NOT_BAPTIZED">미세례</SelectItem>
                            <SelectItem value="PAEDOBAPTISM">유아세례</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mbti">MBTI</Label>
                        <Select value={accountForm.mbti} onValueChange={(v) => setAccountForm({ ...accountForm, mbti: v })}>
                          <SelectTrigger><SelectValue placeholder="MBTI 선택" /></SelectTrigger>
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
                    <Textarea id="description" value={accountForm.description} onChange={(e) => setAccountForm({ ...accountForm, description: e.target.value })} placeholder="추가 정보를 입력하세요" className="min-h-[80px]" />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" className="gap-2 bg-slate-800 hover:bg-slate-700" disabled={!isFormValid || isCreating}>
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
              <div className="flex gap-1 mb-6 rounded-lg bg-slate-100 p-1 dark:bg-slate-800 w-fit">
                <button type="button" onClick={() => setJoinRequestTab("pending")} className={`relative px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${joinRequestTab === "pending" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                  대기 중
                  {joinRequests.length > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-xs w-5 h-5">{joinRequests.length}</span>
                  )}
                </button>
                <button type="button" onClick={handleHistoryTab} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${joinRequestTab === "history" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                  히스토리
                </button>
              </div>

              {joinRequestTab === "pending" && (
                <>
                  {joinRequestsLoading ? (
                    <div className="py-12 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
                      <p className="mt-3 text-slate-500 dark:text-slate-400">불러오는 중...</p>
                    </div>
                  ) : joinRequests.length === 0 ? (
                    <div className="py-12 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                        <UserCheck className="h-6 w-6 text-slate-400" />
                      </div>
                      <p className="text-slate-500 dark:text-slate-400">대기 중인 편입 요청이 없습니다.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {joinRequests.map((request) => (
                        <div key={request.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-lg font-medium">{request.name.charAt(0)}</div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-slate-900 dark:text-white">{request.name}</p>
                                  <Badge variant="outline" className="text-xs">{request.sex === "MALE" ? "남성" : "여성"}</Badge>
                                </div>
                                <div className="mt-1.5 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-500">
                                  <div className="flex items-center gap-1.5"><span className="text-slate-400">생년월일</span><span>{formatBirthday(request.birthday)}</span></div>
                                  <div className="flex items-center gap-1.5"><span className="text-slate-400">이메일</span><span>{request.email}</span></div>
                                  <div className="flex items-center gap-1.5"><span className="text-slate-400">휴대폰</span><span>{request.phone}</span></div>
                                  <div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-slate-400" /><span className="text-slate-400">{request.requestedAt} 요청</span></div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleRejectRequest(request.id)} disabled={rejectingId === request.id || approvingId === request.id} className="text-slate-500 hover:text-red-500 hover:border-red-300">
                                {rejectingId === request.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "거절"}
                              </Button>
                              <Button size="sm" onClick={() => handleApproveRequest(request.id)} disabled={approvingId === request.id || rejectingId === request.id} className="bg-emerald-600 hover:bg-emerald-700">
                                {approvingId === request.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "승인"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {joinRequestTab === "history" && (
                <>
                  {joinHistoryLoading ? (
                    <div className="py-12 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
                      <p className="mt-3 text-slate-500 dark:text-slate-400">불러오는 중...</p>
                    </div>
                  ) : joinHistory.length === 0 ? (
                    <div className="py-12 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                        <Clock className="h-6 w-6 text-slate-400" />
                      </div>
                      <p className="text-slate-500 dark:text-slate-400">처리된 편입 요청이 없습니다.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {joinHistory.map((record) => (
                        <div key={record.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-lg font-medium">{record.name.charAt(0)}</div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-slate-900 dark:text-white">{record.name}</p>
                                  <Badge variant="outline" className="text-xs">{record.sex === "MALE" ? "남성" : "여성"}</Badge>
                                  {record.status === "ACCEPTED" ? (
                                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">승인</Badge>
                                  ) : (
                                    <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">거절</Badge>
                                  )}
                                </div>
                                <div className="mt-1.5 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-500">
                                  <div className="flex items-center gap-1.5"><span className="text-slate-400">생년월일</span><span>{formatBirthday(record.birthday)}</span></div>
                                  <div className="flex items-center gap-1.5"><span className="text-slate-400">이메일</span><span>{record.email}</span></div>
                                  <div className="flex items-center gap-1.5"><span className="text-slate-400">요청일</span><span>{record.requestedAt}</span></div>
                                  <div className="flex items-center gap-1.5"><span className="text-slate-400">처리일</span><span>{record.completedAt}</span></div>
                                </div>
                                {record.completedBy && (
                                  <p className="mt-1.5 text-xs text-slate-400">처리자: {record.completedBy}</p>
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
