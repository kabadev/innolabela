"use server";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

import https from "https";
import Groq from "groq-sdk";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const client = new ElevenLabsClient({
  apiKey: "9e0191a269770b5979ef48db07dd4d7156856174f33ed4f9759603186c483077",
  environment: "https://api.elevenlabs.io",
});

export const translateAi = async (krio: string) => {
  const chatCompletion = await groq.chat.completions.create({
    messages: [
      {
        role: "user",
        content: `Translate this "${krio}" to English only give the plain text `,
      },
    ],
    model: "openai/gpt-oss-20b",
  });
  return chatCompletion.choices[0]?.message?.content || "";
};

export const transscribeKrioAi = async (file: any) => {
  const fileBuffer = await new Promise<Buffer>((resolve, reject) => {
    https.get(file, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve(Buffer.concat(chunks)));
      response.on("error", reject);
    });
  });

  // Create a File-like object with required properties
  const audioFile = new File([fileBuffer as any], "audio.mp3", {
    type: "audio/mpeg",
    lastModified: Date.now(),
  });
  const transcribe: any = await client.speechToText.convert({
    modelId: "scribe_v1",
    file: audioFile!,
  });
  console.log(transcribe);
  return transcribe.text || "";
};
