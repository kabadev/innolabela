"use server";

import AuditLog from "@/lib/models/AuditLog";
import AudioFile from "@/lib/models/AudioFile";
import { connectDB } from "@/lib/mongodb";

// ─── Create Audit Log Entry ───────────────────────────────────────────────────
export async function createAuditLog(data: {
  userId: string;
  userName?: string;
  audioFileId?: string;
  groupId?: string;
  action: string;
  details?: string;
  before?: any;
  after?: any;
}) {
  await connectDB();

  const log = await AuditLog.create(data);
  return JSON.parse(JSON.stringify(log));
}

// ─── Get Audit Logs (paginated) ──────────────────────────────────────────────
export async function getAuditLogs(
  page: number = 1,
  limit: number = 50,
  filter?: { groupId?: string; audioFileId?: string; action?: string }
) {
  await connectDB();

  const query: any = {};
  if (filter?.groupId) query.groupId = filter.groupId;
  if (filter?.audioFileId) query.audioFileId = filter.audioFileId;
  if (filter?.action) query.action = filter.action;

  const total = await AuditLog.countDocuments(query);
  const logs = await AuditLog.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    logs: JSON.parse(JSON.stringify(logs)),
    total,
    totalPages: Math.ceil(total / limit),
    page,
  };
}

// ─── Global Transcript Search ────────────────────────────────────────────────
export async function searchTranscripts(query: string, limit: number = 50) {
  await connectDB();

  if (!query || query.trim().length < 2) {
    return [];
  }

  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  const results = await AudioFile.find({
    $or: [
      { "annotations.transcriptKrio": regex },
      { "annotations.transcriptEnglish": regex },
    ],
  })
    .limit(limit)
    .lean();

  return JSON.parse(JSON.stringify(results));
}

// ─── Review Actions ──────────────────────────────────────────────────────────
export async function approveAnnotation(
  audioFileId: string,
  reviewerId: string,
  reviewerName: string,
  comment?: string
) {
  await connectDB();

  const file = await AudioFile.findById(audioFileId);
  if (!file) throw new Error("File not found");

  const before = file.annotations?.status;

  file.annotations = {
    ...file.annotations,
    status: "verified",
  };

  await file.save();

  await createAuditLog({
    userId: reviewerId,
    userName: reviewerName,
    audioFileId,
    groupId: String(file.groupId),
    action: "review_approved",
    details: comment || "Annotation approved",
    before: { status: before },
    after: { status: "verified" },
  });

  return JSON.parse(JSON.stringify(file));
}

export async function rejectAnnotation(
  audioFileId: string,
  reviewerId: string,
  reviewerName: string,
  comment: string
) {
  await connectDB();

  const file = await AudioFile.findById(audioFileId);
  if (!file) throw new Error("File not found");

  const before = file.annotations?.status;

  file.annotations = {
    ...file.annotations,
    status: "pending",
  };

  await file.save();

  await createAuditLog({
    userId: reviewerId,
    userName: reviewerName,
    audioFileId,
    groupId: String(file.groupId),
    action: "review_rejected",
    details: comment,
    before: { status: before },
    after: { status: "pending" },
  });

  return JSON.parse(JSON.stringify(file));
}

// ─── Get files awaiting review ───────────────────────────────────────────────
export async function getFilesForReview(page: number = 1, limit: number = 20) {
  await connectDB();

  const query = { "annotations.status": "completed" };
  const total = await AudioFile.countDocuments(query);
  const files = await AudioFile.find(query)
    .sort({ updatedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    files: JSON.parse(JSON.stringify(files)),
    total,
    totalPages: Math.ceil(total / limit),
    page,
  };
}
