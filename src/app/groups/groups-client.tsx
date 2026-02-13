"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Search,
  ChevronRight,
  Users,
  Plus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

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

export function GroupsClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // 생성 폼 상태
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/groups");
      const json = await res.json();

      if (json.success) {
        setGroups(json.data.groups);
      } else {
        toast.error(json.error || "소그룹 목록을 불러오지 못했습니다.");
      }
    } catch {
      toast.error("소그룹 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const filteredGroups = groups.filter(
    (group) =>
      group.name.includes(searchQuery) ||
      group.leaderName.includes(searchQuery)
  );

  const totalMembers = groups.reduce((sum, g) => sum + g.memberCount, 0);

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormStartDate("");
    setFormEndDate("");
  };

  const handleCreate = async () => {
    if (!formName.trim()) {
      toast.error("소그룹 이름을 입력해주세요.");
      return;
    }

    try {
      setCreating(true);
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          description: formDescription || undefined,
          startDate: formStartDate || undefined,
          endDate: formEndDate || undefined,
        }),
      });

      const json = await res.json();

      if (json.success) {
        toast.success(`"${json.data.name}" 소그룹이 생성되었습니다.`);
        setDialogOpen(false);
        resetForm();
        fetchGroups();
      } else {
        toast.error(json.error || "소그룹 생성에 실패했습니다.");
      }
    } catch {
      toast.error("소그룹 생성 중 오류가 발생했습니다.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            소그룹 관리
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            소그룹 현황을 확인하고 새로운 소그룹을 만들 수 있습니다
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              새 소그룹
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>새 소그룹 만들기</DialogTitle>
              <DialogDescription>
                소그룹 정보를 입력하고 생성 버튼을 눌러주세요.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="group-name">
                  소그룹 이름 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="group-name"
                  placeholder="예: 청년부 셀"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="group-description">설명</Label>
                <Textarea
                  id="group-description"
                  placeholder="소그룹에 대한 간단한 설명"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="group-start-date">시작일</Label>
                  <Input
                    id="group-start-date"
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="group-end-date">종료일</Label>
                  <Input
                    id="group-end-date"
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}
                disabled={creating}
              >
                취소
              </Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                생성
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  전체 소그룹
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {groups.length}
                </p>
              </div>
              <Users className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  전체 멤버
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {totalMembers}
                </p>
              </div>
              <Users className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="소그룹명 또는 리더 이름으로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : filteredGroups.length === 0 ? (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="mb-4 h-12 w-12 text-slate-300" />
            <p className="text-lg font-medium text-slate-500 dark:text-slate-400">
              {searchQuery ? "검색 결과가 없습니다" : "등록된 소그룹이 없습니다"}
            </p>
            {!searchQuery && (
              <p className="mt-1 text-sm text-slate-400">
                위의 &quot;새 소그룹&quot; 버튼으로 첫 소그룹을 만들어보세요.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <Card className="border-slate-200 transition-shadow hover:shadow-md dark:border-slate-800">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-slate-900 dark:text-white">
                      {group.name}
                    </CardTitle>
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </div>
                  {group.leaderName && (
                    <CardDescription>리더: {group.leaderName}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {group.memberCount}명
                      </span>
                    </div>
                    {group.description && (
                      <Badge
                        variant="outline"
                        className="max-w-[160px] truncate"
                      >
                        {group.description}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
