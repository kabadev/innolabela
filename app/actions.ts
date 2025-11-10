"use server";

import AudioGroup from "@/lib/models/AudioGroup";
import AudioFile from "@/lib/models/AudioFile";
import type { AudioAnnotations } from "@/components/audio-annotation-system";
import { connectDB } from "@/lib/mongodb";
import { getUserById } from "./actions/user";
import { currentUser } from "@clerk/nextjs/server";

export interface AudioFileData {
  id: string;
  name: string;
  url: string;
  duration: number;
  groupId: string;
  annotations?: AudioAnnotations;
}

export interface AudioGroupData {
  id: string;
  name: string;
  dateAdded: Date;
  audioFiles: AudioFileData[];
}

function serializeGroup(group: any, audioFiles: any[]): AudioGroupData {
  return JSON.parse(
    JSON.stringify({
      id: group._id,
      name: group.name,
      dateAdded: group.dateAdded,
      assigned: group.assigned,
      audioFiles: audioFiles.map((file) => ({
        id: file._id,
        name: file.name,
        url: file.url,
        duration: file.duration,
        groupId: file.groupId,
        annotations: file.annotations,
      })),
    })
  );
}

export async function getGroups(): Promise<AudioGroupData[]> {
  const userCurrent = await currentUser();
  await connectDB();

  // Get plain JS objects instead of Mongoose documents

  const groups =
    userCurrent?.publicMetadata.role === "Annotators"
      ? await AudioGroup.find({ assigned: userCurrent.id })
          .sort({ dateAdded: -1 })
          .lean()
      : await AudioGroup.find().sort({ dateAdded: -1 }).lean();

  const groupsWithFiles = await Promise.all(
    groups.map(async (group) => {
      const user = group.assigned ? await getUserById(group.assigned) : null;
      const audioFiles = await AudioFile.find({ groupId: group._id }).lean();

      return serializeGroup(
        {
          ...group,
          assigned: user?.user || null, // more explicit and safe
        },
        audioFiles
      );
    })
  );

  return groupsWithFiles;
}

export async function createGroup(
  name: string,
  audioFilesData: Omit<AudioFileData, "id" | "groupId">[]
): Promise<AudioGroupData> {
  await connectDB();

  const newGroup = await AudioGroup.create({
    name,
    dateAdded: new Date(),
  });

  const audioFiles = await AudioFile.insertMany(
    audioFilesData.map((file) => ({
      name: file.name,
      url: file.url,
      duration: file.duration,
      groupId: newGroup._id,
      annotations: file.annotations || {
        transcriptEnglish: "",
        transcriptKrio: "",
        category: "",
      },
    }))
  );

  return serializeGroup(newGroup, audioFiles);
}

export async function getGroup(
  groupId: string
): Promise<AudioGroupData | null> {
  await connectDB();

  const group = await AudioGroup.findById(groupId);
  if (!group) return null;

  const user = group.assigned ? await getUserById(group.assigned) : null;

  const audioFiles = await AudioFile.find({ groupId: group._id });

  return serializeGroup(
    {
      ...group,
      assigned: user?.user || null,
    },
    audioFiles
  );
}

export async function updateGroup(
  groupId: string,
  updates: { name?: string }
): Promise<AudioGroupData | null> {
  await connectDB();

  const group = await AudioGroup.findByIdAndUpdate(groupId, updates, {
    new: true,
  });
  if (!group) return null;

  const user = group.assigned ? await getUserById(group.assigned) : null;

  const audioFiles = await AudioFile.find({ groupId: group._id });
  return serializeGroup(
    {
      ...group,
      assigned: user?.user || null, // more explicit and safe
    },
    audioFiles
  );
}

export async function deleteGroup(groupId: string): Promise<boolean> {
  await connectDB();

  await AudioFile.deleteMany({ groupId });

  const result = await AudioGroup.findByIdAndDelete(groupId);
  return !!result;
}

export async function addAudioToGroup(
  groupId: string,
  audioFileData: Omit<AudioFileData, "id" | "groupId">
): Promise<AudioGroupData | null> {
  await connectDB();

  const group = await AudioGroup.findById(groupId);
  if (!group) return null;

  const audioCount = await AudioFile.countDocuments({ groupId });
  if (audioCount >= 100) {
    throw new Error("Group has reached maximum capacity of 100 files");
  }

  await AudioFile.create({
    name: audioFileData.name,
    url: audioFileData.url,
    duration: audioFileData.duration,
    groupId: group._id,
    annotations: audioFileData.annotations || {
      transcriptEnglish: "",
      transcriptKrio: "",
      category: "",
    },
  });

  const user = group.assigned ? await getUserById(group.assigned) : null;

  const audioFiles = await AudioFile.find({ groupId: group._id });
  return serializeGroup(
    {
      ...group,
      assigned: user?.user || null, // more explicit and safe
    },
    audioFiles
  );
}

export async function updateAudioAnnotations(
  groupId: string,
  audioId: string,
  annotations: AudioAnnotations
): Promise<AudioFileData | null> {
  await connectDB();

  const audioFile = await AudioFile.findByIdAndUpdate(
    audioId,
    { annotations },
    { new: true }
  );

  if (!audioFile) return null;

  return JSON.parse(
    JSON.stringify({
      id: audioFile._id,
      name: audioFile.name,
      url: audioFile.url,
      duration: audioFile.duration,
      groupId: audioFile.groupId,
      annotations: audioFile.annotations,
    })
  );
}

export async function deleteAudio(
  groupId: string,
  audioId: string
): Promise<boolean> {
  await connectDB();

  const result = await AudioFile.findByIdAndDelete(audioId);
  return !!result;
}

export async function assignUserToGroup(userId: string, groupId: string) {
  try {
    await connectDB();

    const group = await AudioGroup.findById(groupId);

    if (!group)
      return {
        success: false,
      };

    group.assigned = userId;
    await group.save();

    // const audioFiles = await AudioFile.find({ groupId: group._id });
    return {
      success: true,
    };
  } catch (error) {
    console.error("Failed to assign user to group:", error);
  }
}

///// New function for fetching audio groups with filters and pagination

export interface AudioFileWithGroup {
  _id: string;
  name: string;
  url: string;
  duration: number;
  groupId: string;
  groupName: string;
  groupAssigned: string | null;
  groupDateAdded: Date;
  annotations: {
    transcriptEnglish: string;
    transcriptKrio: string;
    category: string;
  };
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetAudioFilesParams {
  page?: number;
  limit?: number;
  search?: string;
  completedFilter?: "all" | "completed" | "incomplete";
  selectedDate?: string; // Changed from startDate/endDate to single selectedDate
}

export async function getAudioFiles(params: GetAudioFilesParams = {}) {
  try {
    await connectDB();

    const {
      page = 1,
      limit = 10,
      search = "",
      completedFilter = "all",
      selectedDate, // Using single date instead of date range
    } = params;

    // Build query for audio files
    const audioQuery: any = {};

    // Search filter (search in audio file name)
    if (search) {
      audioQuery.name = { $regex: search, $options: "i" };
    }

    if (selectedDate) {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      audioQuery.updatedAt = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }

    // Get total count before pagination
    const total = await AudioFile.countDocuments(audioQuery);

    // Get paginated audio files
    const audioFiles = await AudioFile.find(audioQuery)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Get all unique group IDs from the audio files
    const groupIds = [...new Set(audioFiles.map((file) => file.groupId))];

    // Fetch group information
    const groups = await AudioGroup.find({ _id: { $in: groupIds } })
      .select("_id name assigned dateAdded")
      .lean();

    // Map audio files with group information
    const filesWithGroup: any[] = audioFiles.map((file) => {
      const group = groups.find((g) => g._id === file.groupId);

      const isCompleted = !!(
        file.annotations?.transcriptKrio && file.annotations?.transcriptEnglish
      );

      return {
        _id: file._id,
        name: file.name,
        url: file.url,
        duration: file.duration,
        groupId: file.groupId,
        groupName: group?.name || "Unknown",
        groupAssigned: group?.assigned || null,
        groupDateAdded: group?.dateAdded || new Date(),
        annotations: file.annotations || {
          transcriptEnglish: "",
          transcriptKrio: "",
          category: "",
        },
        isCompleted,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      };
    });

    // Apply completed filter
    let filteredFiles = filesWithGroup;
    if (completedFilter === "completed") {
      filteredFiles = filesWithGroup.filter((file) => file.isCompleted);
    } else if (completedFilter === "incomplete") {
      filteredFiles = filesWithGroup.filter((file) => !file.isCompleted);
    }

    return JSON.parse(
      JSON.stringify({
        audioFiles: filteredFiles,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      })
    );
  } catch (error) {
    console.error(" Error fetching audio files:", error);
    throw new Error("Failed to fetch audio files");
  }
}
