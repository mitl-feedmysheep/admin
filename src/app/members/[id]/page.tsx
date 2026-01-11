import Link from "next/link";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, Mail, Phone, MapPin, Calendar } from "lucide-react";

// TODO: 실제 DB 연동
const mockMember = {
  id: "1",
  name: "강소정",
  email: "kang@example.com",
  phone: "010-1234-5678",
  birthday: "1995-03-15",
  address: "서울시 강남구",
  description: "청년부 찬양팀",
  group: "강소정 셀",
  role: "LEADER",
  createdAt: "2024-01-15",
};

const mockPrayers = [
  { id: "1", date: "2026-01-04", request: "새해 첫 셀리더로 셀을 섬기는 만큼 부족함이 있더라도 긍정의 힘으로 나아가기", answered: false },
  { id: "2", date: "2025-12-28", request: "연말 감사 예배 준비가 잘 되도록", answered: true },
  { id: "3", date: "2025-12-21", request: "가족들의 건강을 위해", answered: false },
];

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MemberDetailPage({ params }: PageProps) {
  const { id } = await params;
  // TODO: params.id로 실제 멤버 조회
  console.log("Member ID:", id);
  const member = mockMember;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/members">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {member.name}
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              멤버 상세 정보
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Edit className="h-4 w-4" />
              수정
            </Button>
            <Button variant="outline" className="gap-2 text-red-600 hover:text-red-700">
              <Trash2 className="h-4 w-4" />
              삭제
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Member Info */}
          <Card className="border-slate-200 dark:border-slate-800 lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">
                기본 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600 dark:text-slate-300">
                  {member.email}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600 dark:text-slate-300">
                  {member.phone}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600 dark:text-slate-300">
                  {member.birthday}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600 dark:text-slate-300">
                  {member.address}
                </span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  소속 그룹
                </p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {member.group}
                </p>
                <Badge
                  className="mt-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                >
                  {member.role === "LEADER" ? "리더" : "멤버"}
                </Badge>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  특이사항
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  {member.description}
                </p>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  등록일
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  {member.createdAt}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Prayer History */}
          <Card className="border-slate-200 dark:border-slate-800 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">
                기도제목 히스토리
              </CardTitle>
              <CardDescription>
                최근 나눈 기도제목 목록
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockPrayers.map((prayer) => (
                  <div
                    key={prayer.id}
                    className="flex items-start gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {prayer.date}
                        </span>
                        {prayer.answered && (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            응답됨
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-slate-700 dark:text-slate-200">
                        {prayer.request}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
