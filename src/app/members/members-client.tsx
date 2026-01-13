"use client";

import { useState } from "react";
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
import { Plus, Search, ChevronRight } from "lucide-react";

// TODO: 실제 DB 연동
const mockMembers = [
  { id: "1", name: "강소정", email: "kang@example.com", phone: "010-1234-5678", group: "강소정 셀", role: "LEADER" },
  { id: "2", name: "변재욱", email: "byun@example.com", phone: "010-2345-6789", group: "강소정 셀", role: "MEMBER" },
  { id: "3", name: "서현제", email: "seo@example.com", phone: "010-3456-7890", group: "강소정 셀", role: "MEMBER" },
  { id: "4", name: "강혜정", email: "khj@example.com", phone: "010-4567-8901", group: "강혜정 셀", role: "LEADER" },
  { id: "5", name: "박준성", email: "park@example.com", phone: "010-5678-9012", group: "강혜정 셀", role: "MEMBER" },
  { id: "6", name: "김민지", email: "kim@example.com", phone: "010-6789-0123", group: "김민지 셀", role: "LEADER" },
  { id: "7", name: "류희재", email: "ryu@example.com", phone: "010-7890-1234", group: "류희재 셀", role: "LEADER" },
  { id: "8", name: "박예슬", email: "pye@example.com", phone: "010-8901-2345", group: "박예슬 셀", role: "LEADER" },
];

export function MembersClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const filteredMembers = mockMembers.filter(
    (member) =>
      member.name.includes(searchQuery) ||
      member.email.includes(searchQuery) ||
      member.phone.includes(searchQuery) ||
      member.group.includes(searchQuery)
  );

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
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="이름, 이메일, 전화번호, 그룹으로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Members Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white">
            멤버 목록
          </CardTitle>
          <CardDescription>
            총 {filteredMembers.length}명의 멤버
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    이름
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    이메일
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    전화번호
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    소속 그룹
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">
                    역할
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400">
                    
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      {member.name}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {member.email}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {member.phone}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {member.group}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={member.role === "LEADER" ? "default" : "secondary"}
                        className={
                          member.role === "LEADER"
                            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                            : ""
                        }
                      >
                        {member.role === "LEADER" ? "리더" : "멤버"}
                      </Badge>
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
        </CardContent>
      </Card>
    </div>
  );
}
