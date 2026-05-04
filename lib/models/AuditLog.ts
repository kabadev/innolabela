import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    userName: { type: String, default: "" },
    audioFileId: { type: mongoose.Schema.Types.ObjectId, ref: "AudioFile" },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "AudioGroup" },
    action: {
      type: String,
      enum: [
        "annotation_saved",
        "status_changed",
        "file_deleted",
        "file_added",
        "group_created",
        "group_deleted",
        "batch_transcribe",
        "review_approved",
        "review_rejected",
      ],
      required: true,
    },
    details: { type: String, default: "" },
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

const AuditLog =
  mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);

export default AuditLog;
