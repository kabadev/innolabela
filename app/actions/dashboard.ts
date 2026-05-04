"use server";

import { AUDIO_CONFIG } from "@/lib/config";
import AudioFile from "@/lib/models/AudioFile";
import AudioGroup from "@/lib/models/AudioGroup";
import { connectDB } from "@/lib/mongodb";
import { getUserById } from "./user";

export interface DashboardStats {
  totalFiles: number;
  completedFiles: number;
  verifiedFiles: number;
  incompleteFiles: number;
  completionRate: number;
  totalGroups: number;
  assignedGroups: number;
  unassignedGroups: number;
  totalDurationSeconds: number;
  transcribedDurationSeconds: number;
  statusBreakdown: {
    pending: number;
    krio_done: number;
    english_done: number;
    completed: number;
    verified: number;
  };
  recentActivity: {
    date: string;
    completed: number;
    incomplete: number;
  }[];
  groupStats: {
    name: string;
    total: number;
    completed: number;
    verified: number;
    assigned: string | null;
  }[];
  dailyProgress: {
    date: string;
    count: number;
  }[];
  annotatorStats: {
    name: string;
    userId: string;
    groupsAssigned: number;
    filesCompleted: number;
    filesTotal: number;
  }[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  await connectDB();

  const audioFiles = await AudioFile.find().lean();
  const groups = await AudioGroup.find().lean();

  // Basic stats — use the status field instead of checking transcript content
  const totalFiles = audioFiles.length;

  const statusBreakdown = {
    pending: 0,
    krio_done: 0,
    english_done: 0,
    completed: 0,
    verified: 0,
  };

  audioFiles.forEach((file) => {
    const status = file.annotations?.status || "pending";
    if (status in statusBreakdown) {
      statusBreakdown[status as keyof typeof statusBreakdown]++;
    } else {
      statusBreakdown.pending++;
    }
  });

  const completedFiles = statusBreakdown.completed + statusBreakdown.verified;
  const verifiedFiles = statusBreakdown.verified;
  const incompleteFiles = totalFiles - completedFiles;
  const completionRate =
    totalFiles > 0 ? (completedFiles / totalFiles) * 100 : 0;

  const totalDurationSeconds =
    totalFiles * AUDIO_CONFIG.DEFAULT_AUDIO_DURATION_SECONDS;
  const transcribedDurationSeconds =
    completedFiles * AUDIO_CONFIG.DEFAULT_AUDIO_DURATION_SECONDS;

  const totalGroups = groups.length;
  const assignedGroups = groups.filter((g) => g.assigned).length;
  const unassignedGroups = totalGroups - assignedGroups;

  // Recent activity (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentFiles = audioFiles.filter(
    (file) => new Date(file.updatedAt) >= sevenDaysAgo
  );

  const activityByDate = new Map<
    string,
    { completed: number; incomplete: number }
  >();

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    activityByDate.set(dateStr, { completed: 0, incomplete: 0 });
  }

  recentFiles.forEach((file) => {
    const dateStr = new Date(file.updatedAt).toISOString().split("T")[0];
    const stats = activityByDate.get(dateStr);
    if (stats) {
      const s = file.annotations?.status || "pending";
      if (s === "completed" || s === "verified") {
        stats.completed++;
      } else {
        stats.incomplete++;
      }
    }
  });

  const recentActivity = Array.from(activityByDate.entries()).map(
    ([date, stats]) => ({
      date,
      ...stats,
    })
  );

  // Group stats with resolved assigned user
  const groupsWithFiles = await Promise.all(
    groups.map(async (group) => {
      const user = group.assigned ? await getUserById(group.assigned) : null;
      const gFiles = await AudioFile.find({ groupId: group._id }).lean();
      return {
        ...group,
        assigned: user?.user || null,
        audioFiles: gFiles,
      };
    })
  );

  const groupStats = groupsWithFiles
    .map((group: any) => {
      const files = Array.isArray(group.audioFiles) ? group.audioFiles : [];
      const completed = files.filter(
        (f: any) =>
          f.annotations?.status === "completed" ||
          f.annotations?.status === "verified"
      ).length;
      const verified = files.filter(
        (f: any) => f.annotations?.status === "verified"
      ).length;
      return {
        name: group.name,
        total: files.length,
        completed,
        verified,
        assigned: group.assigned?.firstName ?? null,
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Daily progress (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const progressByDate = new Map<string, number>();

  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    progressByDate.set(dateStr, 0);
  }

  audioFiles
    .filter((file) => new Date(file.createdAt) >= thirtyDaysAgo)
    .forEach((file) => {
      const dateStr = new Date(file.createdAt).toISOString().split("T")[0];
      const count = progressByDate.get(dateStr);
      if (count !== undefined) {
        progressByDate.set(dateStr, count + 1);
      }
    });

  const dailyProgress = Array.from(progressByDate.entries()).map(
    ([date, count]) => ({
      date,
      count,
    })
  );

  // Annotator productivity stats
  const annotatorMap = new Map<
    string,
    {
      name: string;
      userId: string;
      groupsAssigned: number;
      filesCompleted: number;
      filesTotal: number;
    }
  >();

  for (const g of groupsWithFiles) {
    const gAny = g as any;
    if (!gAny.assigned) continue;

    const userId = gAny.assigned.id || String(gAny._id);
    const name =
      `${gAny.assigned.firstName || ""} ${gAny.assigned.lastName || ""}`.trim() ||
      "Unknown";
    const files = Array.isArray(gAny.audioFiles) ? gAny.audioFiles : [];
    const done = files.filter(
      (f: any) =>
        f.annotations?.status === "completed" ||
        f.annotations?.status === "verified"
    ).length;

    if (!annotatorMap.has(userId)) {
      annotatorMap.set(userId, {
        name,
        userId,
        groupsAssigned: 0,
        filesCompleted: 0,
        filesTotal: 0,
      });
    }
    const entry = annotatorMap.get(userId)!;
    entry.groupsAssigned++;
    entry.filesCompleted += done;
    entry.filesTotal += files.length;
  }

  const annotatorStats = Array.from(annotatorMap.values()).sort(
    (a, b) => b.filesCompleted - a.filesCompleted
  );

  return {
    totalFiles,
    completedFiles,
    verifiedFiles,
    incompleteFiles,
    completionRate,
    totalGroups,
    assignedGroups,
    unassignedGroups,
    totalDurationSeconds,
    transcribedDurationSeconds,
    statusBreakdown,
    recentActivity,
    groupStats,
    dailyProgress,
    annotatorStats,
  };
}
