import mongoose, { Schema, type Document } from "mongoose";

export interface IAudioGroup extends Document {
  _id: string;
  name: string;
  assigned: string | null;
  dateAdded: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AudioGroupSchema = new Schema<IAudioGroup>(
  {
    assigned: { type: String, default: null },
    name: { type: String, required: true },
    dateAdded: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.AudioGroup ||
  mongoose.model<IAudioGroup>("AudioGroup", AudioGroupSchema);
