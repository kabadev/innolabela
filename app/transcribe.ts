"use server";
import https from "https";
import Groq from "groq-sdk";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY!,
  environment: "https://api.elevenlabs.io",
});

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
];

async function createGroqCompletion(messages: any[]) {
  let lastError: any = null;
  for (const model of GROQ_MODELS) {
    try {
      const completion = await groq.chat.completions.create({
        messages,
        model,
      });
      return completion;
    } catch (err: any) {
      console.warn(`Groq model ${model} failed, trying fallback:`, err?.message || err);
      lastError = err;
    }
  }
  throw lastError || new Error("All Groq AI models failed.");
}

export const categorizeAi = async (text: string): Promise<string> => {
  if (!text || !text.trim()) return "monologue";
  try {
    const chatCompletion = await createGroqCompletion([
      {
        role: "user",
        content: `Classify the following audio transcript into EXACTLY ONE category from this list: ["conversation", "monologue", "interview", "story", "news", "music", "other"].
Output ONLY the category keyword in lowercase with no punctuation or extra words.

Transcript:
"${text}"`,
      },
    ]);
    const result = chatCompletion.choices[0]?.message?.content?.trim().toLowerCase() || "monologue";
    const validCategories = ["conversation", "monologue", "interview", "story", "news", "music", "other"];
    return validCategories.includes(result) ? result : "monologue";
  } catch (err) {
    console.error("Categorize error:", err);
    return "monologue";
  }
};

export const translateAi = async (krio: string) => {
  try {
    const chatCompletion = await createGroqCompletion([
      {
        role: "user",
        content: `Translate this "${krio}" to English only give the plain text `,
      },
    ]);
    return chatCompletion.choices[0]?.message?.content || "";
  } catch (err) {
    console.error("Translation error:", err);
    return "";
  }
};

export interface WordItem {
  text: string;
  start: number;
  end: number;
  type: string;
  speakerId?: string;
}

export interface SpeakerSegment {
  speakerId: string;
  start: number;
  end: number;
  text: string;
}

export interface SpeakerTag {
  time: number;
  label: string;
}

export interface TranscribeResult {
  text: string;
  rawText: string;
  speakerTags: SpeakerTag[];
  speakerSegments: SpeakerSegment[];
}

function groupWordsBySpeaker(words: WordItem[]): SpeakerSegment[] {
  if (!words || words.length === 0) return [];

  const segments: SpeakerSegment[] = [];
  let currentSegment: SpeakerSegment | null = null;

  for (const item of words) {
    const rawSpeaker = item.speakerId || "speaker_0";
    const speakerId = rawSpeaker === "speaker_0" ? "Speaker A" : rawSpeaker === "speaker_1" ? "Speaker B" : rawSpeaker;

    if (!currentSegment || currentSegment.speakerId !== speakerId) {
      if (currentSegment) {
        currentSegment.text = currentSegment.text.trim();
        segments.push(currentSegment);
      }
      currentSegment = {
        speakerId: speakerId,
        start: item.start,
        end: item.end,
        text: item.text,
      };
    } else {
      currentSegment.text += item.text;
      currentSegment.end = item.end;
    }
  }

  if (currentSegment) {
    currentSegment.text = currentSegment.text.trim();
    segments.push(currentSegment);
  }

  return segments;
}

export const transscribeKrioAi = async (
  file: any,
): Promise<TranscribeResult> => {
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
    diarize: true,
  });

  const words: WordItem[] = transcribe.words || [];
  const segments = groupWordsBySpeaker(words);

  const speakerTags: SpeakerTag[] = segments.map((seg) => ({
    time: Number(seg.start.toFixed(2)),
    label: seg.speakerId,
  }));

  let formattedText = "";
  if (segments.length > 0) {
    formattedText = segments
      .map((seg) => `[${seg.speakerId}]: ${seg.text}`)
      .join("\n\n");
  } else {
    formattedText = transcribe.text || "";
  }

  return {
    text: formattedText,
    rawText: transcribe.text || "",
    speakerTags,
    speakerSegments: segments,
  };
};
