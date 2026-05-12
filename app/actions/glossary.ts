"use server";

import Glossary from "@/lib/models/Glossary";
import { connectDB } from "@/lib/mongodb";
import { revalidatePath } from "next/cache";

export async function getGlossary() {
  await connectDB();
  const entries = await Glossary.find().sort({ krio: 1 }).lean();
  return JSON.parse(JSON.stringify(entries));
}

export async function addGlossaryEntry(data: {
  krio: string;
  variant?: string;
  meaning: string;
  example?: string;
  translation?: string;
}) {
  await connectDB();
  const entry = await Glossary.create(data);
  revalidatePath("/controls/glossary");
  return JSON.parse(JSON.stringify(entry));
}

export async function updateGlossaryEntry(
  id: string,
  data: Partial<{
    krio: string;
    variant: string;
    meaning: string;
    example: string;
    translation: string;
  }>
) {
  await connectDB();
  const entry = await Glossary.findByIdAndUpdate(id, data, { new: true });
  revalidatePath("/controls/glossary");
  return JSON.parse(JSON.stringify(entry));
}

export async function deleteGlossaryEntry(id: string) {
  await connectDB();
  await Glossary.findByIdAndDelete(id);
  revalidatePath("/controls/glossary");
  return { success: true };
}

export async function deleteMultipleGlossaryEntries(ids: string[]) {
  await connectDB();
  await Glossary.deleteMany({ _id: { $in: ids } });
  revalidatePath("/controls/glossary");
  return { success: true };
}

export async function deleteAllGlossaryEntries() {
  await connectDB();
  await Glossary.deleteMany({});
  revalidatePath("/controls/glossary");
  return { success: true };
}

export async function seedGlossary(entries: any[]) {
  await connectDB();
  
  const results = [];
  for (const entry of entries) {
    const updated = await Glossary.findOneAndUpdate(
      { krio: { $regex: new RegExp(`^${entry.krio}$`, "i") } },
      entry,
      { upsert: true, new: true }
    );
    results.push(updated);
  }
  
  const allEntries = await Glossary.find().sort({ krio: 1 }).lean();
  revalidatePath("/controls/glossary");
  return JSON.parse(JSON.stringify(allEntries));
}
