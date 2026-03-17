"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContactAdminDialog } from "@/components/contact-admin-dialog";
import {
  Building2,
  Plus,
  Trash2,
  Users,
  Pencil,
  UserPlus,
  Loader2,
  Search,
  GraduationCap,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ───────────────────────────────────────────────────────────

interface Department {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  groupCount: number;
}

interface DepartmentMember {
  id: string;
  memberId: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
}

interface SearchedMember {
  memberId: string;
  name: string;
  email: string;
  phone?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function roleBadge(role: string) {
  switch (role) {
    case "ADMIN":
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100">
          <ShieldCheck className="mr-1 h-3 w-3" />
          관리자
        </Badge>
      );
    case "LEADER":
      return (
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100">
          <Shield className="mr-1 h-3 w-3" />
          리더
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="dark:bg-slate-700 dark:text-slate-300">
          멤버
        </Badge>
      );
  }
}

function statusBadge(status: string) {
  if (status === "GRADUATED") {
    return (
      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100">
        <GraduationCap className="mr-1 h-3 w-3" />
        졸업
      </Badge>
    );
  }
  return (
    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100">
      활동중
    </Badge>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function DepartmentManageClient() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Selected department
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [deptMembers, setDeptMembers] = useState<DepartmentMember[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(false);

  // Create / Edit department dialog
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptName, setDeptName] = useState("");
  const [deptDescription, setDeptDescription] = useState("");
  const [isSavingDept, setIsSavingDept] = useState(false);

  // Delete department — contact admin dialog
  const [deletingDept, setDeletingDept] = useState<Department | null>(null);
  const [contactAdminOpen, setContactAdminOpen] = useState(false);

  // Add member dialog
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchedMember[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedNewMember, setSelectedNewMember] = useState<SearchedMember | null>(null);
  const [newMemberRole, setNewMemberRole] = useState("MEMBER");
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Member actions
  const [removeMemberContactOpen, setRemoveMemberContactOpen] = useState(false);
  const [removingMember, setRemovingMember] = useState<DepartmentMember | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  // ─── Data Fetching ──────────────────────────────────────────────────

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch("/api/departments");
      const json = await res.json();
      if (res.ok && json.success) {
        setDepartments(json.data.departments);
        setIsSuperAdmin(!!json.data.isSuperAdmin);
      } else {
        toast.error(json.error || "부서 목록을 불러오지 못했습니다.");
      }
    } catch {
      toast.error("부서 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMembers = useCallback(async (departmentId: string) => {
    setIsMembersLoading(true);
    try {
      const res = await fetch(`/api/departments/${departmentId}/members`);
      const json = await res.json();
      if (res.ok && json.success) {
        setDeptMembers(json.data.members);
      } else {
        toast.error(json.error || "멤버 목록을 불러오지 못했습니다.");
      }
    } catch {
      toast.error("멤버 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsMembersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    if (selectedDept) {
      fetchMembers(selectedDept.id);
    }
  }, [selectedDept, fetchMembers]);

  // ─── Department CRUD ────────────────────────────────────────────────

  function openCreateDialog() {
    setEditingDept(null);
    setDeptName("");
    setDeptDescription("");
    setDeptDialogOpen(true);
  }

  function openEditDialog(dept: Department) {
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptDescription(dept.description || "");
    setDeptDialogOpen(true);
  }

  async function handleSaveDepartment() {
    if (!deptName.trim()) {
      toast.error("부서 이름을 입력해주세요.");
      return;
    }
    if (deptName.trim().length > 50) {
      toast.error("부서 이름은 50자 이내로 입력해주세요.");
      return;
    }
    if (deptDescription.trim().length > 200) {
      toast.error("설명은 200자 이내로 입력해주세요.");
      return;
    }

    setIsSavingDept(true);
    try {
      const isEdit = !!editingDept;
      const url = isEdit ? `/api/departments/${editingDept.id}` : "/api/departments";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: deptName.trim(),
          description: deptDescription.trim() || null,
        }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        toast.success(isEdit ? "부서가 수정되었습니다." : "부서가 생성되었습니다.");
        setDeptDialogOpen(false);
        await fetchDepartments();
        if (isEdit && selectedDept?.id === editingDept.id) {
          setSelectedDept({
            ...selectedDept,
            name: deptName.trim(),
            description: deptDescription.trim() || null,
          });
        }
      } else {
        toast.error(json.error || "부서 저장에 실패했습니다.");
      }
    } catch {
      toast.error("부서 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSavingDept(false);
    }
  }

  function openDeleteConfirm(dept: Department) {
    setDeletingDept(dept);
    setContactAdminOpen(true);
  }

  // ─── Member Search & Add ────────────────────────────────────────────

  function openAddMemberDialog() {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedNewMember(null);
    setNewMemberRole("MEMBER");
    setAddMemberOpen(true);
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(
        `/api/system/search-church-member?q=${encodeURIComponent(searchQuery.trim())}`,
      );
      const json = await res.json();
      if (res.ok) {
        setSearchResults(json.members || []);
      } else {
        if (res.status === 404) {
          setSearchResults([]);
        } else {
          toast.error(json.error || "검색에 실패했습니다.");
        }
      }
    } catch {
      toast.error("검색 중 오류가 발생했습니다.");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleAddMember() {
    if (!selectedNewMember || !selectedDept) return;
    setIsAddingMember(true);
    try {
      const res = await fetch(`/api/departments/${selectedDept.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedNewMember.memberId,
          role: newMemberRole,
        }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        toast.success(`${selectedNewMember.name}님이 부서에 추가되었습니다.`);
        setAddMemberOpen(false);
        await fetchMembers(selectedDept.id);
        await fetchDepartments();
      } else {
        toast.error(json.error || "멤버 추가에 실패했습니다.");
      }
    } catch {
      toast.error("멤버 추가 중 오류가 발생했습니다.");
    } finally {
      setIsAddingMember(false);
    }
  }

  // ─── Member Role / Status / Remove ──────────────────────────────────

  async function handleUpdateMember(
    member: DepartmentMember,
    update: { role?: string; status?: string },
  ) {
    if (!selectedDept) return;
    setUpdatingMemberId(member.memberId);
    try {
      const res = await fetch(
        `/api/departments/${selectedDept.id}/members/${member.memberId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(update),
        },
      );
      const json = await res.json();

      if (res.ok && json.success) {
        toast.success("멤버 정보가 수정되었습니다.");
        await fetchMembers(selectedDept.id);
      } else {
        toast.error(json.error || "멤버 정보 수정에 실패했습니다.");
      }
    } catch {
      toast.error("멤버 정보 수정 중 오류가 발생했습니다.");
    } finally {
      setUpdatingMemberId(null);
    }
  }

  function openRemoveMemberContact(member: DepartmentMember) {
    setRemovingMember(member);
    setRemoveMemberContactOpen(true);
  }

  // ─── Render ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">부서 관리</h1>
        <p className="text-slate-500 dark:text-slate-400">교회의 부서를 관리합니다</p>
      </div>

      {departments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className="mt-4 text-lg font-medium text-slate-500 dark:text-slate-400">
              아직 부서가 없습니다
            </p>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
              부서를 추가하여 교회 조직을 관리해보세요
            </p>
            {isSuperAdmin && (
              <Button
                onClick={openCreateDialog}
                className="mt-6 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Plus className="h-4 w-4" />
                첫 부서 추가하기
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-start gap-6">
          {/* ─── Left: Department List ──────────────────────────────── */}
          <div className="w-64 shrink-0 space-y-2">
            {departments.map((dept) => {
              const isActive = selectedDept?.id === dept.id;
              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => setSelectedDept(dept)}
                  className={`w-full rounded-lg border px-4 py-3 text-left transition-all ${
                    isActive
                      ? "border-indigo-400 bg-indigo-50 shadow-sm dark:border-indigo-600 dark:bg-indigo-900/20"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      isActive
                        ? "bg-indigo-200 dark:bg-indigo-800"
                        : "bg-slate-100 dark:bg-slate-800"
                    }`}>
                      <Building2 className={`h-4 w-4 ${
                        isActive
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-slate-500 dark:text-slate-400"
                      }`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${
                        isActive
                          ? "text-indigo-900 dark:text-indigo-200"
                          : "text-slate-800 dark:text-slate-200"
                      }`}>
                        {dept.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        멤버 {dept.memberCount}명 · 소그룹 {dept.groupCount}개
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
            {isSuperAdmin && (
              <Button
                variant="outline"
                onClick={openCreateDialog}
                className="w-full gap-2 border-dashed"
              >
                <Plus className="h-4 w-4" />
                부서 추가
              </Button>
            )}
          </div>

          {/* ─── Right: Department Detail ───────────────────────────── */}
          <div className="flex-1 min-w-0">
            {!selectedDept ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 py-20 dark:border-slate-700">
                <Building2 className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">
                  왼쪽에서 부서를 선택해주세요
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {/* Members */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{selectedDept.name}</CardTitle>
                          {isSuperAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                                onClick={() => openEditDialog(selectedDept)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                                onClick={() => openDeleteConfirm(selectedDept)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                        <CardDescription>
                          {selectedDept.description
                            ? `${selectedDept.description} · 총 ${deptMembers.length}명`
                            : `총 ${deptMembers.length}명`}
                        </CardDescription>
                      </div>
                      <Button
                        onClick={openAddMemberDialog}
                        className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        <UserPlus className="h-4 w-4" />
                        멤버 추가
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isMembersLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      </div>
                    ) : deptMembers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Users className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                          아직 멤버가 없습니다. 위의 멤버 추가 버튼으로 추가해보세요.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {deptMembers.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700"
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="min-w-0">
                                <p className="font-medium text-slate-900 dark:text-white truncate">
                                  {member.name}
                                </p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                                  {member.phone || member.email}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {roleBadge(member.role)}
                                {statusBadge(member.status)}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 ml-4 shrink-0">
                              <Select
                                value={member.role}
                                onValueChange={(value) =>
                                  handleUpdateMember(member, { role: value })
                                }
                                disabled={updatingMemberId === member.memberId}
                              >
                                <SelectTrigger className="h-8 w-[100px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ADMIN">관리자</SelectItem>
                                  <SelectItem value="LEADER">리더</SelectItem>
                                  <SelectItem value="MEMBER">멤버</SelectItem>
                                </SelectContent>
                              </Select>

                              {member.status === "ACTIVE" ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 gap-1 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                                  onClick={() =>
                                    handleUpdateMember(member, { status: "GRADUATED" })
                                  }
                                  disabled={updatingMemberId === member.memberId}
                                >
                                  <GraduationCap className="h-3.5 w-3.5" />
                                  졸업
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 gap-1 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                                  onClick={() =>
                                    handleUpdateMember(member, { status: "ACTIVE" })
                                  }
                                  disabled={updatingMemberId === member.memberId}
                                >
                                  복귀
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                                onClick={() => openRemoveMemberContact(member)}
                                disabled={updatingMemberId === member.memberId}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Create / Edit Department Dialog ─────────────────────────── */}
      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{editingDept ? "부서 수정" : "부서 추가"}</DialogTitle>
            <DialogDescription>
              {editingDept
                ? "부서 정보를 수정합니다."
                : "새로운 부서를 추가합니다."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="dept-name">
                부서 이름 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dept-name"
                placeholder="예: 청년부, 장년부"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                maxLength={50}
              />
              <p className="text-xs text-slate-400">{deptName.length}/50</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-desc">설명</Label>
              <Textarea
                id="dept-desc"
                placeholder="부서에 대한 설명 (선택)"
                value={deptDescription}
                onChange={(e) => setDeptDescription(e.target.value)}
                maxLength={200}
                rows={3}
              />
              <p className="text-xs text-slate-400">{deptDescription.length}/200</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeptDialogOpen(false)}
              disabled={isSavingDept}
            >
              취소
            </Button>
            <Button
              onClick={handleSaveDepartment}
              disabled={isSavingDept || !deptName.trim()}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSavingDept && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingDept ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Department — Contact Admin ─────────────────────── */}
      <ContactAdminDialog
        open={contactAdminOpen}
        onOpenChange={setContactAdminOpen}
        title="부서 삭제 요청"
        description="부서 삭제는 직접 처리할 수 없습니다. 관리자에게 요청을 보내주세요."
        requestTitle="부서 삭제 요청"
        entityType="부서"
        entityName={deletingDept?.name}
        placeholder="삭제 사유를 입력해주세요"
      />

      {/* ─── Add Member Dialog ───────────────────────────────────────── */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>멤버 추가</DialogTitle>
            <DialogDescription>
              교회 멤버를 검색하여 부서에 추가합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Search */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="이름, 전화번호, 이메일로 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                검색
              </Button>
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="max-h-[200px] space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                {searchResults.map((m) => (
                  <button
                    key={m.memberId}
                    type="button"
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      selectedNewMember?.memberId === m.memberId
                        ? "bg-indigo-100 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-300"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                    onClick={() => setSelectedNewMember(m)}
                  >
                    <p className="font-medium text-slate-900 dark:text-white">
                      {m.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {m.phone || m.email}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchQuery && !isSearching && (
              <p className="py-4 text-center text-sm text-slate-400">
                검색 결과가 없습니다.
              </p>
            )}

            {/* Role selection */}
            {selectedNewMember && (
              <div className="space-y-2 rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-800 dark:bg-indigo-900/10">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  선택: <span className="text-indigo-600 dark:text-indigo-400">{selectedNewMember.name}</span>
                </p>
                <div className="flex items-center gap-3">
                  <Label className="text-sm">역할</Label>
                  <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                    <SelectTrigger className="h-8 w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">관리자</SelectItem>
                      <SelectItem value="LEADER">리더</SelectItem>
                      <SelectItem value="MEMBER">멤버</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddMemberOpen(false)}
              disabled={isAddingMember}
            >
              취소
            </Button>
            <Button
              onClick={handleAddMember}
              disabled={!selectedNewMember || isAddingMember}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isAddingMember && <Loader2 className="h-4 w-4 animate-spin" />}
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Remove Member — Contact Admin ─────────────────────────── */}
      <ContactAdminDialog
        open={removeMemberContactOpen}
        onOpenChange={setRemoveMemberContactOpen}
        title="부서 멤버 제거 요청"
        description="부서 멤버 제거는 직접 처리할 수 없습니다. 관리자에게 요청을 보내주세요."
        requestTitle="부서 멤버 제거 요청"
        entityType="부서"
        entityName={selectedDept && removingMember ? `${selectedDept.name} > ${removingMember.name}` : undefined}
        placeholder="제거 사유를 입력해주세요"
      />
    </div>
  );
}
