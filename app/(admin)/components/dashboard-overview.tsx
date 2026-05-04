"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  FileAudio,
  CheckCircle2,
  Clock,
  FolderOpen,
  Users,
  TrendingUp,
  ShieldCheck,
  CircleDot,
  Trophy,
} from "lucide-react";
import type { DashboardStats } from "@/app/actions/dashboard";

interface DashboardOverviewProps {
  stats: DashboardStats;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

const statusColors: Record<string, string> = {
  pending: "bg-slate-200 text-slate-700",
  krio_done: "bg-blue-100 text-blue-700",
  english_done: "bg-indigo-100 text-indigo-700",
  completed: "bg-green-100 text-green-700",
  verified: "bg-purple-100 text-purple-700",
};

export function DashboardOverview({ stats }: DashboardOverviewProps) {
  const statCards = [
    {
      title: "Total Audio Files",
      value: stats.totalFiles.toLocaleString(),
      icon: FileAudio,
      description: `${formatDuration(
        stats.totalDurationSeconds
      )} total duration`,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "Completed",
      value: stats.completedFiles.toLocaleString(),
      icon: CheckCircle2,
      description: `${formatDuration(
        stats.transcribedDurationSeconds
      )} transcribed • ${stats.completionRate.toFixed(1)}% complete`,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950",
    },
    {
      title: "Verified",
      value: stats.verifiedFiles.toLocaleString(),
      icon: ShieldCheck,
      description: "Approved by reviewers",
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
    {
      title: "In Progress",
      value: stats.incompleteFiles.toLocaleString(),
      icon: Clock,
      description: "Awaiting transcription",
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950",
    },
    {
      title: "Total Groups",
      value: stats.totalGroups.toLocaleString(),
      icon: FolderOpen,
      description: `${stats.assignedGroups} assigned • ${stats.unassignedGroups} unassigned`,
      color: "text-cyan-600",
      bgColor: "bg-cyan-50 dark:bg-cyan-950",
    },
  ];

  const chartConfig = {
    completed: {
      label: "Completed",
      color: "hsl(var(--chart-1))",
    },
    incomplete: {
      label: "Incomplete",
      color: "hsl(var(--chart-2))",
    },
    count: {
      label: "Files Added",
      color: "hsl(var(--chart-3))",
    },
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="border-border/40">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Status Breakdown */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleDot className="h-5 w-5 text-blue-600" />
            Status Breakdown
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Distribution of annotation progress across all files
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Object.entries(stats.statusBreakdown).map(([status, count]) => (
              <div key={status} className="flex items-center gap-2">
                <Badge className={statusColors[status] || "bg-slate-100"}>
                  {status.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
                </Badge>
                <span className="text-2xl font-bold">{count}</span>
              </div>
            ))}
          </div>

          {/* Visual progress bar */}
          {stats.totalFiles > 0 && (
            <div className="mt-4 w-full h-4 rounded-full overflow-hidden flex bg-muted">
              {stats.statusBreakdown.verified > 0 && (
                <div
                  className="bg-purple-500 h-full transition-all"
                  style={{ width: `${(stats.statusBreakdown.verified / stats.totalFiles) * 100}%` }}
                  title={`Verified: ${stats.statusBreakdown.verified}`}
                />
              )}
              {stats.statusBreakdown.completed > 0 && (
                <div
                  className="bg-green-500 h-full transition-all"
                  style={{ width: `${(stats.statusBreakdown.completed / stats.totalFiles) * 100}%` }}
                  title={`Completed: ${stats.statusBreakdown.completed}`}
                />
              )}
              {stats.statusBreakdown.english_done > 0 && (
                <div
                  className="bg-indigo-400 h-full transition-all"
                  style={{ width: `${(stats.statusBreakdown.english_done / stats.totalFiles) * 100}%` }}
                  title={`English Done: ${stats.statusBreakdown.english_done}`}
                />
              )}
              {stats.statusBreakdown.krio_done > 0 && (
                <div
                  className="bg-blue-400 h-full transition-all"
                  style={{ width: `${(stats.statusBreakdown.krio_done / stats.totalFiles) * 100}%` }}
                  title={`Krio Done: ${stats.statusBreakdown.krio_done}`}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity Chart */}
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Recent Activity (7 Days)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Daily completion trends
            </p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={stats.recentActivity}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="completed"
                  fill="var(--color-completed)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="incomplete"
                  fill="var(--color-incomplete)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Daily Progress Chart */}
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileAudio className="h-5 w-5 text-purple-600" />
              Files Added (30 Days)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Upload activity over time
            </p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <LineChart data={stats.dailyProgress}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-count)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-count)", r: 4 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Annotator Leaderboard */}
      {stats.annotatorStats.length > 0 && (
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Annotator Leaderboard
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Top annotators by completed files
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.annotatorStats.map((annotator, index) => {
                const rate =
                  annotator.filesTotal > 0
                    ? (annotator.filesCompleted / annotator.filesTotal) * 100
                    : 0;
                return (
                  <div
                    key={annotator.userId}
                    className="flex items-center justify-between border-b border-border/40 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted font-semibold text-muted-foreground">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{annotator.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {annotator.groupsAssigned} group{annotator.groupsAssigned !== 1 ? "s" : ""} assigned
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-emerald-600">
                          {annotator.filesCompleted}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Completed
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {annotator.filesTotal}
                        </p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <p className="text-2xl font-bold">{rate.toFixed(0)}%</p>
                        <p className="text-xs text-muted-foreground">
                          Progress
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Group Stats Table */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-amber-600" />
            Top Groups by Activity
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Most active audio groups
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.groupStats.map((group: any, index: number) => {
              const completionRate =
                group.total > 0 ? (group.completed / group.total) * 100 : 0;
              return (
                <div
                  key={index}
                  className="flex items-center justify-between border-b border-border/40 pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted font-semibold text-muted-foreground">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{group.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {group.assigned ? (
                            <Badge variant="secondary" className="text-xs">
                              <Users className="mr-1 h-3 w-3" />
                              {group.assigned}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Unassigned
                            </Badge>
                          )}
                          {group.verified > 0 && (
                            <Badge className="bg-purple-100 text-purple-700 text-xs">
                              <ShieldCheck className="mr-1 h-3 w-3" />
                              {group.verified} verified
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-2xl font-bold">{group.total}</p>
                      <p className="text-xs text-muted-foreground">
                        Total files
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-600">
                        {group.completed}
                      </p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="text-2xl font-bold">
                        {completionRate.toFixed(0)}%
                      </p>
                      <p className="text-xs text-muted-foreground">Progress</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
