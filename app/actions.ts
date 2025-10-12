"use server";

import AudioGroup from "@/lib/models/AudioGroup";
import AudioFile from "@/lib/models/AudioFile";
import type { AudioAnnotations } from "@/components/audio-annotation-system";
import { connectDB } from "@/lib/mongodb";

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
      id: group._id.toString(),
      name: group.name,
      dateAdded: group.dateAdded,
      audioFiles: audioFiles.map((file) => ({
        id: file._id.toString(),
        name: file.name,
        url: file.url,
        duration: file.duration,
        groupId: file.groupId.toString(),
        annotations: file.annotations,
      })),
    })
  );
}

export async function getGroups(): Promise<AudioGroupData[]> {
  await connectDB();

  const groups = await AudioGroup.find().sort({ dateAdded: -1 });
  const groupsWithFiles = await Promise.all(
    groups.map(async (group) => {
      const audioFiles = await AudioFile.find({ groupId: group._id });
      return serializeGroup(group, audioFiles);
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

  const audioFiles = await AudioFile.find({ groupId: group._id });
  return serializeGroup(group, audioFiles);
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

  const audioFiles = await AudioFile.find({ groupId: group._id });
  return serializeGroup(group, audioFiles);
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

  const audioFiles = await AudioFile.find({ groupId: group._id });
  return serializeGroup(group, audioFiles);
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
