"use server";

import { AUDIO_CONFIG } from "@/lib/config";
import AudioFile from "@/lib/models/AudioFile";
import AudioGroup from "@/lib/models/AudioGroup";
import { connectDB } from "@/lib/mongodb";
import { getUserById } from "./user";

export interface DashboardStats {
  totalFiles: number;
  completedFiles: number;
  incompleteFiles: number;
  completionRate: number;
  totalGroups: number;
  assignedGroups: number;
  unassignedGroups: number;
  totalDurationSeconds: number;
  transcribedDurationSeconds: number;
  recentActivity: {
    date: string;
    completed: number;
    incomplete: number;
  }[];
  groupStats: {
    name: string;
    total: number;
    completed: number;
    assigned: string | null;
  }[];
  dailyProgress: {
    date: string;
    count: number;
  }[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  await connectDB();

  // Get all audio files with their groups
  const audioFiles = await AudioFile.find().lean();
  const groups = await AudioGroup.find().lean();

  // Calculate basic stats
  const totalFiles = audioFiles.length;
  const completedFiles = audioFiles.filter(
    (file) =>
      file.annotations?.transcriptKrio && file.annotations?.transcriptEnglish
  ).length;
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
      const isCompleted =
        file.annotations?.transcriptKrio && file.annotations?.transcriptEnglish;
      if (isCompleted) {
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

  // Group stats
  const groupStatsMap = new Map<
    string,
    { name: string; total: number; completed: number; assigned: string | null }
  >();

  const groupsWithFiles = await Promise.all(
    groups.map(async (group) => {
      const user = group.assigned ? await getUserById(group.assigned) : null;
      const audioFiles = await AudioFile.find({ groupId: group._id }).lean();
      return {
        ...group,
        assigned: user?.user || null,
        audioFiles,
      };
    })
  );

  // Build group stats using groupsWithFiles which already contains
  // the resolved assigned user name and the group's audioFiles.
  // Use string keys for consistency with file.groupId which may be an ObjectId.
  groupsWithFiles.forEach((group: any) => {
    const key = String(group?._id);
    const files = Array.isArray(group.audioFiles) ? group.audioFiles : [];
    const completed = files.filter(
      (f: any) =>
        f.annotations?.transcriptKrio && f.annotations?.transcriptEnglish
    ).length;

    groupStatsMap.set(key, {
      name: group.name,
      total: files.length,
      completed,
      assigned: group.assigned?.firstName ?? null,
    });
  });

  const groupStats = Array.from(groupStatsMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

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

  return {
    totalFiles,
    completedFiles,
    incompleteFiles,
    completionRate,
    totalGroups,
    assignedGroups,
    unassignedGroups,
    totalDurationSeconds,
    transcribedDurationSeconds,
    recentActivity,
    groupStats,
    dailyProgress,
  };
}
