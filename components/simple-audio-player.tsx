"use client";

import type React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
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
  X,
  Volume2,
  VolumeX,
  Gauge,
  CheckCircle,
  Clock,
  MessageSquare,
  UserPlus,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { AudioFileWithSegments } from "./audio-annotation-system";
import { translateAi, transscribeKrioAi } from "@/app/transcribe";
import { useUser } from "@clerk/nextjs";
import { hasPermission, UserRole } from "@/lib/utils";

interface SimpleAudioPlayerProps {
  audioFile: AudioFileWithSegments;
  onSave?: (annotations: {
    transcriptEnglish: string;
    transcriptKrio: string;
    category: string;
    status: "pending" | "krio_done" | "english_done" | "completed" | "verified";
    speakerTags: { time: number; label: string }[];
  }) => void;
  onClose?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export function SimpleAudioPlayer({
  audioFile,
  onSave,
  onClose,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
}: SimpleAudioPlayerProps) {
  const { user } = useUser();
  const isAdmin = user && hasPermission(user.publicMetadata?.role as UserRole, ["Admin", "Project Lead"]);

  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  const [isLooping, setIsLooping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartTime, setDragStartTime] = useState<number | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [transcriptEnglish, setTranscriptEnglish] = useState("");
  const [transcriptKrio, setTranscriptKrio] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<"pending" | "krio_done" | "english_done" | "completed" | "verified">("pending");
  const [speakerTags, setSpeakerTags] = useState<{ time: number; label: string }[]>([]);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLCanvasElement>(null);

  // Use refs for loop values so the timeupdate handler always has fresh data
  // without needing to be re-registered on every state change.
  const loopStartRef = useRef<number | null>(null);
  const loopEndRef = useRef<number | null>(null);
  const isLoopingRef = useRef(false);

  useEffect(() => { loopStartRef.current = loopStart; }, [loopStart]);
  useEffect(() => { loopEndRef.current = loopEnd; }, [loopEnd]);
  useEffect(() => { isLoopingRef.current = isLooping; }, [isLooping]);

  // ─── Waveform generation ───────────────────────────────────────────────────
  useEffect(() => {
    if (!audioFile?.url) return;
    setTranscriptEnglish(audioFile?.annotations?.transcriptEnglish ?? "");
    setTranscriptKrio(audioFile?.annotations?.transcriptKrio ?? "");
    setCategory(audioFile?.annotations?.category ?? "");
    setStatus((audioFile?.annotations?.status as typeof status) ?? "pending");
    setSpeakerTags(audioFile?.annotations?.speakerTags ?? []);

    const generateWaveform = async () => {
      try {
        const response = await fetch(
          `https://innolabela.vercel.app/api/proxy-audio?url=${encodeURIComponent(audioFile.url)}`
        );
        const arrayBuffer = await response.arrayBuffer();
        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
          audioContext.decodeAudioData(arrayBuffer, resolve, reject);
        });
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
        setWaveformData(Array.from({ length: 800 }, () => Math.random() * 0.5));
      }
    };

    if (typeof window !== "undefined") generateWaveform();
  }, [audioFile?.url]);

  // ─── Draw waveform ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = waveformRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Always draw at the canvas's internal resolution (800×200).
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Detect dark mode for adaptive colors
    const isDark = document.documentElement.classList.contains("dark");
    const playedColor  = isDark ? "#a5b4fc" : "#818cf8";  // brighter in dark
    const unplayedColor = isDark ? "#4b5563" : "#334155";  // subtle shift

    // Base waveform bars
    const barWidth = width / waveformData.length;
    const centerY = height / 2;
    const progressFraction = duration > 0 ? currentTime / duration : 0;

    waveformData.forEach((amplitude, i) => {
      const barHeight = Math.max(2, amplitude * height * 0.85);
      const x = i * barWidth;
      const fraction = i / waveformData.length;

      // Colour bars: played = bright, upcoming = dim
      ctx.fillStyle = fraction < progressFraction ? playedColor : unplayedColor;
      ctx.fillRect(x, centerY - barHeight / 2, Math.max(barWidth - 1, 0.5), barHeight);
    });

    // Loop region highlight
    if (loopStart !== null && loopEnd !== null && duration > 0) {
      const startX = (Math.min(loopStart, loopEnd) / duration) * width;
      const endX   = (Math.max(loopStart, loopEnd) / duration) * width;

      ctx.fillStyle = "rgba(52, 211, 153, 0.18)";
      ctx.fillRect(startX, 0, endX - startX, height);

      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(startX, 0); ctx.lineTo(startX, height);
      ctx.moveTo(endX, 0);   ctx.lineTo(endX, height);
      ctx.stroke();

      // Loop region labels
      ctx.fillStyle = "#34d399";
      ctx.font = "10px monospace";
      if (startX > 4)       ctx.fillText("▶", startX + 3, 12);
      if (endX < width - 4) ctx.fillText("◀", endX - 11, 12);
    }

    // Playhead
    if (duration > 0) {
      const playheadX = progressFraction * width;
      
      // Draw speaker tags on waveform
      speakerTags.forEach(tag => {
        const tagX = (tag.time / duration) * width;
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.moveTo(tagX, 0);
        ctx.lineTo(tagX, height);
        ctx.stroke();
        
        ctx.font = "9px sans-serif";
        ctx.fillText(tag.label, tagX + 2, height - 10);
      });

      ctx.strokeStyle = "#f87171";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      ctx.fillStyle = "#f87171";
      ctx.beginPath();
      ctx.arc(playheadX, 8, 5, 0, 2 * Math.PI);
      ctx.fill();
    }
  }, [waveformData, loopStart, loopEnd, currentTime, duration]);

  // ─── Audio event listeners ─────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);

      // Use refs so this handler doesn't need to be re-registered
      if (
        isLoopingRef.current &&
        loopStartRef.current !== null &&
        loopEndRef.current !== null
      ) {
        const end = Math.max(loopStartRef.current, loopEndRef.current);
        // Seek back slightly before the boundary to avoid a gap
        if (audio.currentTime >= end - 0.05) {
          audio.currentTime = Math.min(loopStartRef.current, loopEndRef.current);
        }
      }
    };

    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      // If looping, restart immediately
      if (isLoopingRef.current && loopStartRef.current !== null) {
        audio.currentTime = Math.min(
          loopStartRef.current,
          loopEndRef.current ?? loopStartRef.current
        );
        audio.play();
      } else {
        setIsPlaying(false);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    // Initial audio properties
    audio.playbackRate = playbackRate;
    audio.volume = isMuted ? 0 : volume;

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioFile, playbackRate, volume, isMuted]);

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play();
    else audio.pause();
  }, []);

  const seekRelative = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + seconds));
  }, []);

  const seekToFraction = useCallback((fraction: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = Math.max(0, Math.min(duration, fraction * duration));
  }, [duration]);

  // Convert a MouseEvent on the canvas to a time value using rendered size
  const eventToTime = useCallback((e: React.MouseEvent): number => {
    const canvas = waveformRef.current;
    if (!canvas || !duration) return 0;
    const rect = canvas.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    return fraction * duration;
  }, [duration]);

  // ─── Waveform interaction ──────────────────────────────────────────────────
  const handleWaveformMouseDown = (e: React.MouseEvent) => {
    if (!duration) return;
    const t = eventToTime(e);
    setDragStartTime(t);
    setIsDragging(true);
    // Reset loop; will only commit if user actually drags
    setLoopStart(t);
    setLoopEnd(t);
    setIsLooping(false);
  };

  const handleWaveformMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || dragStartTime === null) return;
    const t = eventToTime(e);
    setLoopStart(Math.min(dragStartTime, t));
    setLoopEnd(Math.max(dragStartTime, t));
  };

  const handleWaveformMouseUp = (e: React.MouseEvent) => {
    if (!isDragging || dragStartTime === null) return;
    setIsDragging(false);

    const t = eventToTime(e);
    const start = Math.min(dragStartTime, t);
    const end   = Math.max(dragStartTime, t);

    if (end - start > 0.15) {
      // Committed region — enable loop
      setLoopStart(start);
      setLoopEnd(end);
      setIsLooping(true);
      const audio = audioRef.current;
      if (audio) audio.currentTime = start;
    } else {
      // Treat as a simple seek click
      seekToFraction((e.clientX - (waveformRef.current?.getBoundingClientRect().left ?? 0)) /
        (waveformRef.current?.getBoundingClientRect().width ?? 1));
      setLoopStart(null);
      setLoopEnd(null);
    }

    setDragStartTime(null);
  };

  const handleWaveformMouseLeave = (e: React.MouseEvent) => {
    // If still dragging when mouse leaves, commit what we have
    if (isDragging) handleWaveformMouseUp(e);
  };

  const toggleLoop = () => {
    if (loopStart !== null && loopEnd !== null) {
      const next = !isLooping;
      setIsLooping(next);
      if (next) {
        // Jump to loop start when re-enabling
        const audio = audioRef.current;
        if (audio) audio.currentTime = Math.min(loopStart, loopEnd);
      }
    }
  };

  const clearLoop = () => {
    setLoopStart(null);
    setLoopEnd(null);
    setIsLooping(false);
  };


    // ─── Annotations ───────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    onSave?.({ transcriptEnglish, transcriptKrio, category, status, speakerTags });
    setHasUnsavedChanges(false);
    setLastSavedTime(new Date());
  }, [onSave, transcriptEnglish, transcriptKrio, category, status, speakerTags]);

  
  // ─── Keyboard shortcuts — use refs so handlers never go stale ─────────────
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S: Save from anywhere (even while typing)
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
        return;
      }

      const active = document.activeElement;
      const isTyping =
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.tagName === "SELECT" ||
          active.getAttribute("contenteditable") === "true");
      if (isTyping) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlayPause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          e.shiftKey ? seekRelative(-5) : seekRelative(-1);
          break;
        case "ArrowRight":
          e.preventDefault();
          e.shiftKey ? seekRelative(5) : seekRelative(1);
          break;
        case "l":
        case "L":
          e.preventDefault();
          toggleLoop();
          break;
        case "c":
        case "C":
          e.preventDefault();
          clearLoop();
          break;
        case "n":
        case "N":
          if (hasNext) onNext?.();
          break;
        case "p":
        case "P":
          if (hasPrev) onPrev?.();
          break;
        case "Escape":
          if (window.innerWidth < 1024) onClose?.();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlayPause, seekRelative, handleSave, loopStart, loopEnd, isLooping, onClose, onNext, onPrev, hasNext, hasPrev]);


  // Auto-save logic (debounced 30s)
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const timer = setTimeout(() => {
      handleSave();
    }, 30000);

    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, handleSave]);

  const handleTranslate = async () => {
    try {
      setIsLoading(true);
      setTranscriptEnglish(await translateAi(transcriptKrio));
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranscribe = async () => {
    try {
      setIsLoading(true);
      setTranscriptKrio(await transscribeKrioAi(audioFile.url));
    } catch (err) {
      console.error("Transcription error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const [customSpeakerLabel, setCustomSpeakerLabel] = useState("");

  const addSpeakerTag = (label: string) => {
    if (!label.trim()) return;
    setSpeakerTags(prev => [...prev, { time: currentTime, label: label.trim() }].sort((a, b) => a.time - b.time));
    setHasUnsavedChanges(true);
  };

  const removeSpeakerTag = (index: number) => {
    setSpeakerTags(prev => prev.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  const formatTime = (time: number) => {
    const m  = Math.floor(time / 60);
    const s  = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${m}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  const loopDuration =
    loopStart !== null && loopEnd !== null
      ? Math.abs(loopEnd - loopStart)
      : null;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-65px)] flex flex-col p-4 lg:p-6">
      <audio ref={audioRef} src={audioFile.url} preload="metadata" />

      {/* Mobile back button + Nav */}
      <div className="mb-4 flex items-center justify-between">
        <div className="lg:hidden">
          <Button variant="ghost" size="sm" onClick={onClose} className="flex items-center gap-2 -ml-2">
            <ArrowLeft className="w-4 h-4" />
            Back to List
          </Button>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {hasPrev && (
            <Button variant="outline" size="sm" onClick={onPrev} title="Previous file (P)">
              <SkipBack className="w-3.5 h-3.5 mr-1" /> Prev
            </Button>
          )}
          {hasNext && (
            <Button variant="outline" size="sm" onClick={onNext} title="Next file (N)">
              Next <SkipForward className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 lg:mb-6">
        <h2 className="text-base lg:text-xl font-semibold mb-1 lg:mb-2 line-clamp-2">
          {audioFile.name}
        </h2>
        <p className="text-xs lg:text-sm text-muted-foreground">
          <span className="hidden sm:inline">Click & drag to select a loop region · click to seek</span>
          <span className="sm:hidden">Tap waveform to seek</span>
        </p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 overflow-y-auto pb-4">

        {/* ── Audio Player ── */}
        <div className="space-y-4 lg:space-y-5">

          {/* Waveform canvas */}
          <div className="relative select-none">
            <canvas
              ref={waveformRef}
              width={800}
              height={200}
              className="w-full h-32 lg:h-48 border rounded-lg bg-slate-900 cursor-crosshair"
              style={{ cursor: isDragging ? "col-resize" : "crosshair" }}
              onMouseDown={handleWaveformMouseDown}
              onMouseMove={handleWaveformMouseMove}
              onMouseUp={handleWaveformMouseUp}
              onMouseLeave={handleWaveformMouseLeave}
            />

            {waveformData.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900 border rounded-lg">
                <span className="text-slate-500 text-sm animate-pulse">Loading waveform…</span>
              </div>
            )}

            {/* Drag hint overlay while dragging */}
            {isDragging && loopStart !== null && loopEnd !== null && Math.abs(loopEnd - loopStart) > 0.1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-emerald-900/80 text-emerald-300 text-xs px-2 py-0.5 rounded pointer-events-none">
                {formatTime(Math.min(loopStart, loopEnd))} → {formatTime(Math.max(loopStart, loopEnd))}
              </div>
            )}
          </div>

          {/* Transport controls */}
          <div className="flex items-center gap-2 lg:gap-3 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => seekRelative(-5)} title="Back 5s">
              <SkipBack className="w-4 h-4" />
            </Button>

            <Button
              onClick={togglePlayPause}
              size="lg"
              className="min-w-[52px]"
              title="Play / Pause (Space)"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>

            <Button variant="outline" size="sm" onClick={() => seekRelative(5)} title="Forward 5s">
              <SkipForward className="w-4 h-4" />
            </Button>

            {/* Playback Speed */}
            <div className="flex items-center gap-1.5 ml-1">
              <Gauge className="w-4 h-4 text-muted-foreground" />
              <Select value={playbackRate.toString()} onValueChange={(v) => setPlaybackRate(parseFloat(v))}>
                <SelectTrigger className="h-8 w-[70px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <SelectItem key={rate} value={rate.toString()}>{rate}x</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-2 ml-2 min-w-[100px] group">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                max={100}
                step={1}
                onValueChange={([v]) => {
                  setVolume(v / 100);
                  if (v > 0) setIsMuted(false);
                }}
                className="w-20"
              />
            </div>

            {loopStart !== null && loopEnd !== null && (
              <>
                <Button
                  variant={isLooping ? "default" : "outline"}
                  size="sm"
                  onClick={toggleLoop}
                  title="Toggle loop (L)"
                  className={
                    isLooping
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                  }
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  <span>{isLooping ? "Looping" : "Loop"}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearLoop}
                  title="Clear selection (C)"
                  className="text-muted-foreground"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  <span className="hidden sm:inline">Clear</span>
                </Button>
              </>
            )}
          </div>

          {/* Time display */}
          <div className="flex items-center gap-3 text-xs lg:text-sm text-muted-foreground font-mono">
            <span>{formatTime(currentTime)}</span>
            <span className="text-slate-400">/</span>
            <span>{formatTime(duration)}</span>

            {isLooping && loopDuration !== null && (
              <span className="ml-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-sans">
                Loop · {formatTime(loopDuration)}
              </span>
            )}
          </div>

          {/* Loop region info */}
          {loopStart !== null && loopEnd !== null && !isDragging && (
            <div className="text-xs text-muted-foreground font-mono bg-muted/40 rounded px-3 py-1.5 flex items-center gap-4">
              <span>▶ {formatTime(Math.min(loopStart, loopEnd))}</span>
              <span>◀ {formatTime(Math.max(loopStart, loopEnd))}</span>
              <span className="text-slate-400">({formatTime(loopDuration!)})</span>
            </div>
          )}
        </div>

        {/* ── Annotations ── */}
        <div className="space-y-4 lg:space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base lg:text-lg font-semibold">Annotations</h3>
              {lastSavedTime && !hasUnsavedChanges && (
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  Saved {lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSave}
                size="sm"
                className={hasUnsavedChanges ? "bg-orange-600 hover:bg-orange-700" : ""}
              >
                <Save className="w-4 h-4 mr-2" />
                {hasUnsavedChanges ? "Save Changes" : "Save"}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status" className="flex items-center gap-1.5 mb-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Status
                </Label>
                <Select value={status} onValueChange={(v) => { setStatus(v as typeof status); setHasUnsavedChanges(true); }}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" /> Pending
                      </div>
                    </SelectItem>
                    <SelectItem value="krio_done">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-400" /> Krio Done
                      </div>
                    </SelectItem>
                    <SelectItem value="english_done">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-indigo-400" /> English Done
                      </div>
                    </SelectItem>
                    <SelectItem value="completed">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" /> Completed
                      </div>
                    </SelectItem>
                    {isAdmin && (
                      <SelectItem value="verified">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-purple-500" /> Verified
                        </div>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category" className="flex items-center gap-1.5 mb-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Category
                </Label>
                <Select value={category} onValueChange={(v) => { setCategory(v); setHasUnsavedChanges(true); }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {["conversation","monologue","interview","story","news","music","other"].map((v) => (
                      <SelectItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex gap-2 mb-2 flex-wrap items-center">
                <Label htmlFor="transcript-krio">Transcript (Krio)</Label>
                <Button className="cursor-pointer h-8 text-xs" onClick={handleTranscribe} size="sm" disabled={isLoading}>
                  <Sparkles className="w-3 h-3 mr-1" />
                  {isLoading ? "Transcribing…" : "Pre-transcribe"}
                </Button>
              </div>
              <Textarea
                id="transcript-krio"
                placeholder="Enter Krio transcript…"
                value={transcriptKrio}
                onChange={(e) => { setTranscriptKrio(e.target.value); setHasUnsavedChanges(true); }}
                className="min-h-[100px] lg:min-h-[120px] resize-none text-sm"
              />
            </div>

            <div>
              <div className="flex gap-2 mb-2 flex-wrap items-center">
                <Label htmlFor="transcript-english">Transcript (English)</Label>
                <Button className="cursor-pointer h-8 text-xs" onClick={handleTranslate} size="sm" disabled={isLoading}>
                  <Sparkles className="w-3 h-3 mr-1" />
                  {isLoading ? "Translating…" : "Translate"}
                </Button>
              </div>
              <Textarea
                id="transcript-english"
                placeholder="Enter English transcript…"
                value={transcriptEnglish}
                onChange={(e) => { setTranscriptEnglish(e.target.value); setHasUnsavedChanges(true); }}
                className="min-h-[100px] lg:min-h-[120px] resize-none text-sm"
              />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" />
                Speaker Tags
              </Label>
              <div className="flex gap-1 flex-wrap">
                {["Speaker A", "Speaker B", "Interviewer"].map(label => (
                  <Button 
                    key={label} 
                    variant="outline" 
                    size="xs" 
                    className="h-6 px-2 text-[10px]"
                    onClick={() => addSpeakerTag(label)}
                  >
                    + {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom speaker label input */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Custom label..."
                className="h-7 text-xs flex-1"
                value={customSpeakerLabel}
                onChange={(e) => setCustomSpeakerLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customSpeakerLabel.trim()) {
                    addSpeakerTag(customSpeakerLabel);
                    setCustomSpeakerLabel("");
                  }
                }}
              />
              <Button
                variant="outline"
                size="xs"
                className="h-7 text-[10px]"
                onClick={() => {
                  if (customSpeakerLabel.trim()) {
                    addSpeakerTag(customSpeakerLabel);
                    setCustomSpeakerLabel("");
                  }
                }}
              >
                Add
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {speakerTags.length === 0 ? (
                <p className="text-[10px] text-muted-foreground italic">No speaker tags added. Position playhead and click a label above.</p>
              ) : (
                speakerTags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="gap-1.5 px-2 py-0.5 text-[10px] cursor-pointer" onClick={() => {
                    const audio = audioRef.current;
                    if (audio) audio.currentTime = tag.time;
                  }}>
                    <span className="font-mono text-slate-500">{formatTime(tag.time)}</span>
                    {tag.label}
                    <X className="w-2.5 h-2.5 cursor-pointer hover:text-destructive" onClick={(e) => { e.stopPropagation(); removeSpeakerTag(i); }} />
                  </Badge>
                ))
              )}
            </div>
          </div>

          {hasUnsavedChanges && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
              <p className="text-sm text-orange-800">You have unsaved changes</p>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard shortcuts legend */}
      <div className="border-t pt-3 lg:pt-4 text-xs text-muted-foreground mt-4">
        <div className="flex gap-3 lg:gap-6 flex-wrap">
          <span>Space: Play/Pause</span>
          <span>←/→: Seek 1s</span>
          <span>Shift+←/→: Seek 5s</span>
          <span>L: Toggle loop</span>
          <span>C: Clear region</span>
          <span>Ctrl+S: Save</span>
          <span>N/P: Next/Prev file</span>
          <span className="hidden lg:inline">Click & drag: Loop</span>
        </div>
      </div>
    </div>
  );
}