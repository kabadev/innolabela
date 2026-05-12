import mongoose, { Schema, type Document } from "mongoose";

export interface IGlossary extends Document {
  krio: string;
  variant: string;
  meaning: string;
  example: string;
  translation: string;
  createdAt: Date;
  updatedAt: Date;
}

const GlossarySchema = new Schema<IGlossary>(
  {
    krio: { type: String, required: true, index: true },
    variant: { type: String, default: "" },
    meaning: { type: String, required: true },
    example: { type: String, default: "" },
    translation: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Glossary ||
  mongoose.model<IGlossary>("Glossary", GlossarySchema);
