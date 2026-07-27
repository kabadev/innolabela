import mongoose, { Schema, type Document } from "mongoose";

export interface IAudioAnnotations {
  transcriptEnglish: string;
  transcriptKrio: string;
  category: string;
  status: "pending" | "krio_done" | "english_done" | "completed" | "verified";
  speakerTags?: { time: number; label: string }[];
}

export interface IAudioFile extends Document {
  _id: string;
  name: string;
  url: string;
  duration: number;
  groupId: mongoose.Types.ObjectId;
  annotations: IAudioAnnotations;
  createdAt: Date;
  updatedAt: Date;
}

const AudioAnnotationsSchema = new Schema<IAudioAnnotations>(
  {
    transcriptEnglish: { type: String, default: "" },
    transcriptKrio: { type: String, default: "" },
    category: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "krio_done", "english_done", "completed", "verified"],
      default: "pending",
    },
    speakerTags: [
      {
        time: { type: Number },
        label: { type: String },
      },
    ],
  },
  { _id: false }
);

const AudioFileSchema = new Schema<IAudioFile>(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    duration: { type: Number, default: 20 },
    groupId: { type: Schema.Types.ObjectId, ref: "AudioGroup", required: true },
    annotations: { type: AudioAnnotationsSchema, default: () => ({}) },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.AudioFile ||
  mongoose.model<IAudioFile>("AudioFile", AudioFileSchema);
