"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Loader2,
  RefreshCcw,
  Server,
  Activity,
  BookOpen,
  HandHeart,
  UserPlus,
  HardDrive,
  Terminal,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// --- Types ---

interface ContainerMetric {
  id: number | bigint;
  collected_at: string;
  container_name: string;
  status: string;
  cpu_percent: string | number | null;
  memory_mb: number | null;
  memory_percent: string | number | null;
  disk_percent: string | number | null;
  network_rx_mb: string | number | null;
  network_tx_mb: string | number | null;
  restart_count: number | null;
  api_avg_response_ms: number | null;
  api_error_rate: string | number | null;
  jvm_heap_mb: number | null;
  active_threads: number | null;
  mysql_connections: number | null;
  mysql_slow_queries: number | null;
  mysql_threads_running: number | null;
}

interface MonitoringData {
  containers: ContainerMetric[];
  history: ContainerMetric[];
  activity: {
    weeklyGatherings: number;
    weeklyPrayers: number;
    totalPrayers: number;
    recentSignups: Array<{ date: string; count: number | bigint }>;
    weekStart: string;
    weekEnd: string;
  };
}

// --- Constants ---

const RANGE_OPTIONS = [
  { value: "1h", label: "1시간" },
  { value: "6h", label: "6시간" },
  { value: "24h", label: "24시간" },
  { value: "7d", label: "7일" },
  { value: "30d", label: "30일" },
];

const CONTAINER_COLORS: Record<string, string> = {
  "intotheheaven-api": "#3b82f6",
  "intotheheaven-admin": "#8b5cf6",
  "local-mysql": "#f59e0b",
};

const CONTAINER_LABELS: Record<string, string> = {
  "intotheheaven-api": "Backend",
  "intotheheaven-admin": "Admin",
  "local-mysql": "MySQL",
};

const LOG_CAPABLE_CONTAINERS = new Set([
  "intotheheaven-api",
  "intotheheaven-admin",
]);

const LOG_LINES_OPTIONS = [
  { value: "100", label: "100줄" },
  { value: "200", label: "200줄" },
  { value: "500", label: "500줄" },
  { value: "1000", label: "1000줄" },
];

// --- Helpers ---

function parseDecimal(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  return parseFloat(val) || 0;
}

function formatTime(dateStr: string, range: string): string {
  const d = new Date(dateStr);
  if (range === "7d" || range === "30d") {
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  }
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatLastCollected(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  return `${Math.floor(diffHour / 24)}일 전`;
}

/**
 * Group history rows by time, producing one object per timestamp
 * with keys like "into-the-heaven-backend" for each container.
 */
function buildChartData(
  history: ContainerMetric[],
  field: keyof ContainerMetric,
  containerNames: string[],
  range: string,
  isDecimal: boolean = false,
) {
  const timeMap = new Map<string, Record<string, unknown>>();

  for (const row of history) {
    const timeKey = row.collected_at;
    if (!timeMap.has(timeKey)) {
      timeMap.set(timeKey, { time: formatTime(timeKey, range) });
    }
    const entry = timeMap.get(timeKey)!;
    const val = row[field];
    entry[row.container_name] = isDecimal ? parseDecimal(val as string | number | null) : (val ?? 0);
  }

  return Array.from(timeMap.values());
}

// --- Component ---

export function MonitoringClient() {
  const [range, setRange] = useState("24h");
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [logContainer, setLogContainer] = useState("");
  const [logLines, setLogLines] = useState("200");
  const [logContent, setLogContent] = useState("");
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState("");
  const logEndRef = useCallback((node: HTMLDivElement | null) => {
    if (node) node.scrollTop = node.scrollHeight;
  }, []);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const res = await fetch(`/api/system/monitoring?range=${range}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        }
      } catch (error) {
        console.error("Failed to fetch monitoring data:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [range],
  );

  const fetchLogs = useCallback(
    async (container: string, lines: string) => {
      setLogLoading(true);
      setLogError("");
      setLogContent("");
      try {
        const res = await fetch(
          `/api/system/monitoring/logs?container=${container}&lines=${lines}&since=24h`
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          setLogError(json.error || "로그 조회에 실패했습니다.");
        } else {
          setLogContent(json.data.logs || "(로그가 비어있습니다)");
        }
      } catch {
        setLogError("로그 프록시 서버에 연결할 수 없습니다.");
      } finally {
        setLogLoading(false);
      }
    },
    []
  );

  function openLogDialog(containerName: string) {
    setLogContainer(containerName);
    setLogDialogOpen(true);
    fetchLogs(containerName, logLines);
  }

  // Initial load & range change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true);
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const containerNames = useMemo(() => {
    if (!data) return [];
    const names = new Set<string>();
    for (const row of data.history) {
      names.add(row.container_name);
    }
    return Array.from(names);
  }, [data]);

  // Chart data
  const cpuChartData = useMemo(
    () => (data ? buildChartData(data.history, "cpu_percent", containerNames, range, true) : []),
    [data, containerNames, range],
  );
  const memoryChartData = useMemo(
    () => (data ? buildChartData(data.history, "memory_percent", containerNames, range, true) : []),
    [data, containerNames, range],
  );

  // Backend-only charts
  const backendHistory = useMemo(
    () => (data ? data.history.filter((r) => r.container_name === "intotheheaven-api") : []),
    [data],
  );
  const apiChartData = useMemo(() => {
    return backendHistory.map((r) => ({
      time: formatTime(r.collected_at, range),
      api_avg_response_ms: r.api_avg_response_ms ?? 0,
      jvm_heap_mb: r.jvm_heap_mb ?? 0,
    }));
  }, [backendHistory, range]);

  // MySQL-only charts
  const mysqlHistory = useMemo(
    () => (data ? data.history.filter((r) => r.container_name === "local-mysql") : []),
    [data],
  );
  const mysqlChartData = useMemo(() => {
    return mysqlHistory.map((r) => ({
      time: formatTime(r.collected_at, range),
      mysql_connections: r.mysql_connections ?? 0,
      mysql_threads_running: r.mysql_threads_running ?? 0,
    }));
  }, [mysqlHistory, range]);

  // Total new signups in 30 days
  const totalNewSignups = useMemo(() => {
    if (!data) return 0;
    return data.activity.recentSignups.reduce((sum, r) => sum + Number(r.count), 0);
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-24 text-center text-slate-500 dark:text-slate-400">
        데이터가 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            모니터링
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            시스템 상태를 실시간으로 확인하세요
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            title="새로고침"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* A. 서비스 상태 */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
          서비스 상태
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.containers.map((c) => {
            const isRunning = c.status === "running";
            const hasLogs = LOG_CAPABLE_CONTAINERS.has(c.container_name);
            return (
              <Card
                key={c.container_name}
                className={`border-slate-200 dark:border-slate-800 ${
                  hasLogs
                    ? "cursor-pointer transition-shadow hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600"
                    : ""
                }`}
                onClick={hasLogs ? () => openLogDialog(c.container_name) : undefined}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-slate-400" />
                      {CONTAINER_LABELS[c.container_name] || c.container_name}
                      {hasLogs && (
                        <Terminal className="h-3.5 w-3.5 text-slate-400" />
                      )}
                    </div>
                  </CardTitle>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      isRunning
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {isRunning ? "running" : "stopped"}
                  </span>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        CPU
                      </p>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {parseDecimal(c.cpu_percent).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Memory
                      </p>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {c.memory_mb ?? 0}MB
                      </p>
                      <p className="text-xs text-slate-400">
                        ({parseDecimal(c.memory_percent).toFixed(1)}%)
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Restarts
                      </p>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {c.restart_count ?? 0}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      마지막 수집: {formatLastCollected(c.collected_at)}
                    </p>
                    {hasLogs && (
                      <p className="text-xs text-blue-500 dark:text-blue-400">
                        클릭하여 로그 보기
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {/* 디스크 사용량 카드 */}
          {(() => {
            const latestDisk = data.containers.length > 0
              ? parseDecimal(data.containers[0].disk_percent)
              : null;
            if (latestDisk === null) return null;
            return (
              <Card className={`border ${
                latestDisk >= 90
                  ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                  : latestDisk >= 80
                    ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
                    : "border-slate-200 dark:border-slate-800"
              }`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className={`text-sm font-medium ${
                    latestDisk >= 90
                      ? "text-red-600 dark:text-red-400"
                      : latestDisk >= 80
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-slate-900 dark:text-white"
                  }`}>
                    <div className="flex items-center gap-2">
                      <HardDrive className={`h-4 w-4 ${
                        latestDisk >= 90
                          ? "text-red-500"
                          : latestDisk >= 80
                            ? "text-amber-500"
                            : "text-slate-400"
                      }`} />
                      호스트 디스크
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${
                    latestDisk >= 90
                      ? "text-red-600 dark:text-red-400"
                      : latestDisk >= 80
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-slate-900 dark:text-white"
                  }`}>
                    {latestDisk}%
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        latestDisk >= 90
                          ? "bg-red-500"
                          : latestDisk >= 80
                            ? "bg-amber-500"
                            : latestDisk >= 60
                              ? "bg-blue-500"
                              : "bg-emerald-500"
                      }`}
                      style={{ width: `${latestDisk}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {latestDisk >= 90 ? "디스크 공간 부족" : latestDisk >= 80 ? "디스크 정리 필요" : "macOS 호스트"}
                  </p>
                  <p className="text-xs text-slate-400">
                    마지막 수집: {formatLastCollected(data.containers[0].collected_at)}
                  </p>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      </div>

      {/* B. 앱 활동 지표 */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
          앱 활동 지표
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-slate-200 dark:border-slate-800" title={`${data.activity.weekStart} (일) ~ ${data.activity.weekEnd} (토)`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                이번 주 모임 생성
              </CardTitle>
              <Activity className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {data.activity.weeklyGatherings}
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 dark:border-slate-800" title={`${data.activity.weekStart} (일) ~ ${data.activity.weekEnd} (토)`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                이번 주 기도제목
              </CardTitle>
              <HandHeart className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {data.activity.weeklyPrayers}
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                전체 기도제목
              </CardTitle>
              <BookOpen className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {data.activity.totalPrayers.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                신규 가입자 (30일)
              </CardTitle>
              <UserPlus className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {totalNewSignups}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* C. CPU 사용률 추이 */}
      {cpuChartData.length > 0 && (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white">
              CPU 사용률 추이
            </CardTitle>
            <CardDescription>컨테이너별 CPU 사용률 (%)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cpuChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    unit="%"
                  />
                  <Tooltip />
                  {containerNames.map((name) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      name={CONTAINER_LABELS[name] || name}
                      stroke={CONTAINER_COLORS[name] || "#94a3b8"}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* E. 메모리 사용률 추이 */}
      {memoryChartData.length > 0 && (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white">
              메모리 사용률 추이
            </CardTitle>
            <CardDescription>컨테이너별 메모리 사용률 (%)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={memoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    unit="%"
                  />
                  <Tooltip />
                  {containerNames.map((name) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      name={CONTAINER_LABELS[name] || name}
                      stroke={CONTAINER_COLORS[name] || "#94a3b8"}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* F. API 모니터링 */}
      {apiChartData.length > 0 && (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white">
              API 모니터링
            </CardTitle>
            <CardDescription>
              Backend 평균 응답시간 (ms) / JVM Heap (MB)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={apiChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    unit="ms"
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    unit="MB"
                  />
                  <Tooltip />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="api_avg_response_ms"
                    name="Avg Response (ms)"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="jvm_heap_mb"
                    name="JVM Heap (MB)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* G. MySQL 모니터링 */}
      {mysqlChartData.length > 0 && (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white">
              MySQL 모니터링
            </CardTitle>
            <CardDescription>
              Connections / Threads Running
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mysqlChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="mysql_connections"
                    name="Connections"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="mysql_threads_running"
                    name="Threads Running"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log Viewer Dialog */}
      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent className="sm:max-w-[95vw] max-w-[calc(100%-2rem)] w-full h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              {CONTAINER_LABELS[logContainer] || logContainer} 로그
            </DialogTitle>
            <DialogDescription>
              컨테이너: {logContainer}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <Select
              value={logLines}
              onValueChange={(val) => {
                setLogLines(val);
                fetchLogs(logContainer, val);
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOG_LINES_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchLogs(logContainer, logLines)}
              disabled={logLoading}
              title="새로고침"
            >
              {logLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div
            ref={logEndRef}
            className="flex-1 overflow-auto rounded-md bg-slate-950 p-4 font-mono text-xs leading-relaxed text-green-400"
          >
            {logLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
              </div>
            )}
            {logError && (
              <div className="text-red-400">{logError}</div>
            )}
            {!logLoading && !logError && (
              <pre className="whitespace-pre-wrap">{logContent}</pre>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
