"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Save,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import type { AudioFileWithSegments } from "./audio-annotation-system";
import { translateAi, transscribeKrioAi } from "@/app/transcribe";

interface SimpleAudioPlayerProps {
  audioFile: AudioFileWithSegments;
  onSave?: (annotations: {
    transcriptEnglish: string;
    transcriptKrio: string;
    category: string;
  }) => void;
  onClose?: () => void;
}

export function SimpleAudioPlayer({
  audioFile,
  onSave,
  onClose,
}: SimpleAudioPlayerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  const [isLooping, setIsLooping] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [transcriptEnglish, setTranscriptEnglish] = useState("");
  const [transcriptKrio, setTranscriptKrio] = useState("");
  const [category, setCategory] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!audioFile?.url) return;
    setTranscriptEnglish(audioFile?.annotations?.transcriptEnglish! || "");
    setTranscriptKrio(audioFile?.annotations?.transcriptKrio || "");
    setCategory(audioFile?.annotations?.category || "");
    const generateWaveform = async () => {
      try {
        const response = await fetch(
          // https://innolabela.vercel.app/groups
          // `http://localhost:3000/api/proxy-audio?url=${encodeURIComponent(
          `https://innolabela.vercel.app/api/proxy-audio?url=${encodeURIComponent(
            audioFile.url
          )}`
        );

        const arrayBuffer = await response.arrayBuffer();

        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();

        const audioBuffer = await new Promise<AudioBuffer>(
          (resolve, reject) => {
            audioContext.decodeAudioData(arrayBuffer, resolve, reject);
          }
        );

        const channelData = audioBuffer.getChannelData(0);
        const samples = 800;
        const blockSize = Math.floor(channelData.length / samples);
        const waveform: number[] = [];

        for (let i = 0; i < samples; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[i * blockSize + j] || 0);
          }
          waveform.push(sum / blockSize);
        }

        setWaveformData(waveform);
      } catch (err) {
        console.error("[Waveform] Error:", err);
        const fallback = Array.from({ length: 800 }, () => Math.random() * 0.5);
        setWaveformData(fallback);
      }
    };

    if (typeof window !== "undefined") generateWaveform();
  }, [audioFile?.url]);

  useEffect(() => {
    const drawWaveform = () => {
      const canvas = waveformRef.current;
      if (!canvas || waveformData.length === 0) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = "#e5e7eb";
      const barWidth = width / waveformData.length;
      const centerY = height / 2;

      waveformData.forEach((amplitude, i) => {
        const barHeight = amplitude * height * 0.8;
        const x = i * barWidth;
        ctx.fillRect(x, centerY - barHeight / 2, barWidth - 0.5, barHeight);
      });

      if (loopStart !== null && loopEnd !== null && duration > 0) {
        const startX = (loopStart / duration) * width;
        const endX = (loopEnd / duration) * width;

        ctx.fillStyle = "rgba(34, 197, 94, 0.2)";
        ctx.fillRect(startX, 0, endX - startX, height);

        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, 0);
        ctx.lineTo(startX, height);
        ctx.moveTo(endX, 0);
        ctx.lineTo(endX, height);
        ctx.stroke();
      }

      if (duration > 0) {
        const playheadX = (currentTime / duration) * width;
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, height);
        ctx.stroke();

        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(playheadX, 10, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
    };

    drawWaveform();
  }, [waveformData, loopStart, loopEnd, currentTime, duration]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);

      if (isLooping && loopStart !== null && loopEnd !== null && isPlaying) {
        if (audio.currentTime >= loopEnd) {
          audio.currentTime = loopStart;
        }
      }
    };

    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [audioFile, isLooping, loopStart, loopEnd, isPlaying]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isTyping =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.tagName === "SELECT" ||
          activeElement.getAttribute("contenteditable") === "true");

      if (isTyping) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlayPause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekRelative(-1);
          break;
        case "ArrowRight":
          e.preventDefault();
          seekRelative(1);
          break;
        case "l":
          e.preventDefault();
          toggleLoop();
          break;
        case "c":
          e.preventDefault();
          clearLoop();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [loopStart, loopEnd]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const seekRelative = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = Math.max(
      0,
      Math.min(duration, audio.currentTime + seconds)
    );
  };

  const seekToTime = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = Math.max(0, Math.min(duration, time));
  };

  const handleWaveformMouseDown = (e: React.MouseEvent) => {
    const canvas = waveformRef.current;
    if (!canvas || duration === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickTime = (x / canvas.width) * duration;

    setIsSelecting(true);
    setLoopStart(clickTime);
    setLoopEnd(clickTime);
    setIsLooping(false);
  };

  const handleWaveformMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting) return;

    const canvas = waveformRef.current;
    if (!canvas || duration === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const moveTime = (x / canvas.width) * duration;

    if (loopStart !== null) {
      setLoopEnd(moveTime);
    }
  };

  const handleWaveformMouseUp = () => {
    if (isSelecting && loopStart !== null && loopEnd !== null) {
      const start = Math.min(loopStart, loopEnd);
      const end = Math.max(loopStart, loopEnd);

      if (end - start > 0.1) {
        setLoopStart(start);
        setLoopEnd(end);
        setIsLooping(true);
        seekToTime(start);
        console.log("[v0] Created loop region:", start, "to", end);
      } else {
        seekToTime(loopStart);
        setLoopStart(null);
        setLoopEnd(null);
      }
    }
    setIsSelecting(false);
  };

  const toggleLoop = () => {
    if (loopStart !== null && loopEnd !== null) {
      setIsLooping(!isLooping);
      console.log("[v0] Toggled loop:", !isLooping);
    }
  };

  const clearLoop = () => {
    setLoopStart(null);
    setLoopEnd(null);
    setIsLooping(false);
    console.log("[v0] Cleared loop region");
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        transcriptEnglish,
        transcriptKrio,
        category,
      });
      setHasUnsavedChanges(false);
      console.log("[v0] Saved annotations for:", audioFile.name);
    }
  };

  const handleAnnotationChange = () => {
    setHasUnsavedChanges(true);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${milliseconds
      .toString()
      .padStart(2, "0")}`;
  };

  const handleTranslate = async () => {
    try {
      setIsLoading(true);
      const translatedEglish = await translateAi(transcriptKrio);
      setTranscriptEnglish(translatedEglish);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.log("error:", error);
    }
  };

  const handleTranscribe = async () => {
    try {
      setIsLoading(true);
      const text = await transscribeKrioAi(audioFile.url);
      setTranscriptKrio(text);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.log("error:", error);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Escape key to close on mobile
      if (e.key === "Escape" && window.innerWidth < 1024) {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="h-full flex flex-col p-4 lg:p-6 bg-background">
      <audio ref={audioRef} src={audioFile.url} />

      {/* Mobile Back Button */}
      <div className="mb-4 lg:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="flex items-center gap-2 -ml-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to List
        </Button>
      </div>

      <div className="mb-4 lg:mb-6">
        <h2 className="text-base lg:text-xl font-semibold mb-1 lg:mb-2 line-clamp-2">
          {audioFile.name}
        </h2>
        <p className="text-xs lg:text-sm text-muted-foreground">
          <span className="hidden sm:inline">
            Click and drag on the waveform to select a region to loop
          </span>
          <span className="sm:hidden">Tap waveform to play/pause</span>
        </p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 overflow-y-auto pb-4">
        {/* Audio Player Section */}
        <div className="space-y-4 lg:space-y-6">
          <div className="relative">
            <canvas
              ref={waveformRef}
              width={800}
              height={200}
              className="w-full h-32 lg:h-48 border rounded-md bg-gray-600 cursor-crosshair"
              onMouseDown={handleWaveformMouseDown}
              onMouseMove={handleWaveformMouseMove}
              onMouseUp={handleWaveformMouseUp}
              onMouseLeave={handleWaveformMouseUp}
            />
            {waveformData.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-600 border rounded-md">
                <span className="text-gray-500 text-sm">
                  Loading waveform...
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 lg:gap-4 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => seekRelative(-5)}
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button onClick={togglePlayPause} size="lg">
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => seekRelative(5)}>
              <SkipForward className="w-4 h-4" />
            </Button>

            {loopStart !== null && loopEnd !== null && (
              <>
                <Button
                  variant={isLooping ? "default" : "outline"}
                  size="sm"
                  onClick={toggleLoop}
                  className={isLooping ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">
                    {isLooping ? "Stop Loop" : "Start Loop"}
                  </span>
                  <span className="sm:hidden">Loop</span>
                </Button>
                <Button variant="outline" size="sm" onClick={clearLoop}>
                  <span className="hidden sm:inline">Clear Selection</span>
                  <span className="sm:inline lg:hidden">Clear</span>
                </Button>
              </>
            )}
          </div>

          <div className="text-xs lg:text-sm text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
            {isLooping && (
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                Looping: {formatTime(loopStart || 0)} -{" "}
                {formatTime(loopEnd || 0)}
              </span>
            )}
          </div>
        </div>

        {/* Annotation Section */}
        <div className="space-y-4 lg:space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base lg:text-lg font-semibold">Annotations</h3>
            <Button
              onClick={handleSave}
              size="sm"
              className={
                hasUnsavedChanges ? "bg-orange-600 hover:bg-orange-700" : ""
              }
            >
              <Save className="w-4 h-4 mr-2" />
              {hasUnsavedChanges ? "Save Changes" : "Save"}
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={category}
                onValueChange={(value) => {
                  setCategory(value);
                  handleAnnotationChange();
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conversation">Conversation</SelectItem>
                  <SelectItem value="monologue">Monologue</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="news">News</SelectItem>
                  <SelectItem value="music">Music</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex gap-2 mb-2 flex-wrap items-center">
                <Label htmlFor="transcript-krio">Transcript (Krio)</Label>
                <Button
                  className="cursor-pointer h-8 text-xs"
                  onClick={handleTranscribe}
                  size="sm"
                  disabled={isLoading}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {isLoading ? "Transcribing..." : "Pre-transcribe"}
                </Button>
              </div>
              <Textarea
                id="transcript-krio"
                placeholder="Enter Krio transcript..."
                value={transcriptKrio}
                onChange={(e) => {
                  setTranscriptKrio(e.target.value);
                  handleAnnotationChange();
                }}
                className="min-h-[100px] lg:min-h-[120px] resize-none text-sm"
              />
            </div>

            <div>
              <div className="flex gap-2 mb-2 flex-wrap items-center">
                <Label htmlFor="transcript-english">Transcript (English)</Label>
                <Button
                  className="cursor-pointer h-8 text-xs"
                  onClick={handleTranslate}
                  size="sm"
                  disabled={isLoading}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {isLoading ? "Translating..." : "Translate"}
                </Button>
              </div>
              <Textarea
                id="transcript-english"
                placeholder="Enter English transcript..."
                value={transcriptEnglish}
                onChange={(e) => {
                  setTranscriptEnglish(e.target.value);
                  handleAnnotationChange();
                }}
                className="min-h-[100px] lg:min-h-[120px] resize-none text-sm"
              />
            </div>
          </div>

          {hasUnsavedChanges && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
              <p className="text-sm text-orange-800">
                You have unsaved changes
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t pt-3 lg:pt-4 text-xs text-muted-foreground mt-4">
        <div className="flex gap-3 lg:gap-6 flex-wrap">
          <span>• Space: Play/Pause</span>
          <span>• ←/→: Seek 1s</span>
          <span>• L: Toggle loop</span>
          <span>• C: Clear selection</span>
          <span className="hidden lg:inline">
            • Click & drag: Select loop region
          </span>
        </div>
      </div>
    </div>
  );
}
