"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Church, ArrowLeft } from "lucide-react";

interface AdminChurch {
  churchId: string;
  churchName: string;
  role: string;
}

type Step = "login" | "select-church";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 로그인 성공 후 상태
  const [memberId, setMemberId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [churches, setChurches] = useState<AdminChurch[]>([]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "로그인에 실패했습니다.");
        return;
      }

      // 교회 선택 단계로 이동
      setMemberId(data.memberId);
      setMemberName(data.memberName);
      setChurches(data.churches);

      if (data.churches.length === 1) {
        // 교회가 하나뿐이면 바로 선택
        await selectChurch(data.memberId, data.churches[0].churchId);
      } else {
        setStep("select-church");
      }
    } catch {
      setError("서버 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectChurch = async (mId: string, churchId: string) => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/select-church", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: mId, churchId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "교회 선택에 실패했습니다.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("서버 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectChurch = (churchId: string) => {
    selectChurch(memberId, churchId);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {step === "login" ? (
        <Card className="w-full max-w-md mx-4 border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600">
              <Church className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              IntoTheHeaven
            </CardTitle>
            <CardDescription className="text-slate-400">
              관리자 페이지에 오신 것을 환영합니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200">
                  이메일
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200">
                  비밀번호
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}
              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={isLoading}
              >
                {isLoading ? "로그인 중..." : "로그인"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-md mx-4 border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardHeader className="text-center">
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-4 text-slate-400 hover:text-white"
              onClick={() => setStep("login")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600">
              <Church className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              교회 선택
            </CardTitle>
            <CardDescription className="text-slate-400">
              {memberName}님, 관리할 교회를 선택해주세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {churches.map((church) => (
                <button
                  key={church.churchId}
                  onClick={() => handleSelectChurch(church.churchId)}
                  disabled={isLoading}
                  className="w-full flex items-center gap-4 p-4 rounded-lg border border-slate-600 bg-slate-700/30 hover:bg-slate-700/50 transition-colors text-left disabled:opacity-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600/20">
                    <Church className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{church.churchName}</p>
                    <p className="text-sm text-slate-400">관리자</p>
                  </div>
                </button>
              ))}
            </div>
            {error && (
              <p className="mt-4 text-sm text-red-400 text-center">{error}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
