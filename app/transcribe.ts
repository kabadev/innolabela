"use server";
import https from "https";
import Groq from "groq-sdk";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY!,
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
    const speakerId = item.speakerId || "speaker_0";

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

export const transscribeKrioAi = async (file: any): Promise<TranscribeResult> => {
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

  console.log(transcribe);

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
