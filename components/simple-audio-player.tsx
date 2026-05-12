"use client";

import type React from "react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
  CheckCircle2,
  Clock,
  MessageSquare,
  UserPlus,
  ArrowRight,
  Info,
  Keyboard,
  History,
  Languages,
  Music,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, hasPermission, UserRole } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";

import { DEFAULT_GLOSSARY } from "@/lib/glossary-defaults";

import type { AudioAnnotations, AudioFileWithSegments } from "./audio-annotation-system";
import { translateAi, transscribeKrioAi } from "@/app/transcribe";
import { Separator } from "./ui/separator";


interface SimpleAudioPlayerProps {
  audioFile: AudioFileWithSegments;
  onSave?: (annotations: AudioAnnotations) => void;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  initialGlossary?: any[];
}

export function SimpleAudioPlayer({
  audioFile,
  onSave,
  onClose,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
  initialGlossary = [],
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
  const [customSpeakerLabel, setCustomSpeakerLabel] = useState("");
  const [cheatSheetSearch, setCheatSheetSearch] = useState("");
  const glossary = useMemo(() => initialGlossary.length > 0 ? initialGlossary : DEFAULT_GLOSSARY, [initialGlossary]);

  const filteredCheatSheet = useMemo(() => {
    return glossary.filter(item => 
      item.krio.toLowerCase().includes(cheatSheetSearch.toLowerCase()) ||
      item.meaning.toLowerCase().includes(cheatSheetSearch.toLowerCase()) ||
      (item.variant && item.variant.toLowerCase().includes(cheatSheetSearch.toLowerCase()))
    );
  }, [glossary, cheatSheetSearch]);

  const waveformRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const loopStartRef = useRef<number | null>(null);
  const loopEndRef = useRef<number | null>(null);
  const isLoopingRef = useRef(false);

  useEffect(() => { loopStartRef.current = loopStart; }, [loopStart]);
  useEffect(() => { loopEndRef.current = loopEnd; }, [loopEnd]);
  useEffect(() => { isLoopingRef.current = isLooping; }, [isLooping]);

  // Reset and load file data
  useEffect(() => {
    if (!audioFile) return;
    setTranscriptEnglish(audioFile?.annotations?.transcriptEnglish ?? "");
    setTranscriptKrio(audioFile?.annotations?.transcriptKrio ?? "");
    setCategory(audioFile?.annotations?.category ?? "");
    setStatus((audioFile?.annotations?.status as typeof status) ?? "pending");
    setSpeakerTags(audioFile?.annotations?.speakerTags ?? []);
    setHasUnsavedChanges(false);
    setLastSavedTime(null);
    clearLoop();

    const generateWaveform = async () => {
      try {
        // const proxyUrl = `https://innolabela.vercel.app/api/proxy-audio?url=${encodeURIComponent(audioFile.url)}`;
        const proxyUrl = `/api/proxy-audio?url=${encodeURIComponent(audioFile.url)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch audio through proxy: ${response.status} ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength === 0) {
          throw new Error("Received empty array buffer");
        }

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        
        const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
          audioContext.decodeAudioData(arrayBuffer, resolve, (err) => {
            console.error("[Waveform] decodeAudioData error:", err);
            reject(new Error("Unable to decode audio data"));
          });
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
        // Close context to free resources
        await audioContext.close();
      } catch (err) {
        console.error("[Waveform] Generation failed:", err);
        // Fallback to dummy data so UI doesn't stay in "Rendering..." state forever
        setWaveformData(Array.from({ length: 800 }, () => 0.1 + Math.random() * 0.2));
      }
    };

    if (typeof window !== "undefined") generateWaveform();
  }, [audioFile?.url]);

  // Draw waveform
  useEffect(() => {
    const canvas = waveformRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const isDark = document.documentElement.classList.contains("dark");
    const playedColor = isDark ? "#818cf8" : "#4f46e5";
    const unplayedColor = isDark ? "#334155" : "#e2e8f0";
    
    const barWidth = width / waveformData.length;
    const centerY = height / 2;
    const progressFraction = duration > 0 ? currentTime / duration : 0;

    waveformData.forEach((amplitude, i) => {
      const barHeight = Math.max(3, amplitude * height * 0.9);
      const x = i * barWidth;
      const fraction = i / waveformData.length;

      ctx.fillStyle = fraction < progressFraction ? playedColor : unplayedColor;
      
      // Rounded rect implementation for bars
      const radius = 1.5;
      const bx = x + 0.5;
      const by = centerY - barHeight / 2;
      const bw = Math.max(barWidth - 1, 1);
      const bh = barHeight;
      
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, radius);
      ctx.fill();
    });

    // Timeline Ruler (inside waveform)
    if (duration > 0) {
      ctx.fillStyle = isDark ? "rgba(148, 163, 184, 0.5)" : "rgba(100, 116, 139, 0.5)";
      ctx.font = "9px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      
      let interval = 5;
      if (duration > 60) interval = 10;
      if (duration > 300) interval = 30;
      if (duration > 600) interval = 60;
      
      const tickCount = Math.floor(duration / interval);
      for (let i = 0; i <= tickCount; i++) {
        const time = i * interval;
        const x = (time / duration) * width;
        
        // Tick at the bottom
        ctx.fillRect(x - 0.5, height - 12, 1, 4);
        
        // Label
        if (i % (duration > 300 ? 2 : 1) === 0) {
          ctx.fillText(formatTime(time), x, height - 3);
        }
      }
    }

    // Loop region highlight
    if (loopStart !== null && loopEnd !== null && duration > 0) {
      const startX = (Math.min(loopStart, loopEnd) / duration) * width;
      const endX = (Math.max(loopStart, loopEnd) / duration) * width;

      ctx.fillStyle = "rgba(79, 70, 229, 0.15)";
      ctx.fillRect(startX, 0, endX - startX, height);

      ctx.strokeStyle = "#5f59c5ff";
      ctx.setLineDash([5, 3]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX, 0); ctx.lineTo(startX, height);
      ctx.moveTo(endX, 0); ctx.lineTo(endX, height);
      ctx.stroke();
    }

    // Playhead
    if (duration > 0) {
      const playheadX = progressFraction * width;
      
      // Speaker tags
      speakerTags.forEach(tag => {
        const tagX = (tag.time / duration) * width;
        ctx.strokeStyle = "rgba(245, 158, 11, 0.6)";
        ctx.setLineDash([2, 2]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tagX, 10);
        ctx.lineTo(tagX, height - 10);
        ctx.stroke();
      });

      ctx.strokeStyle = "#ef4444";
      ctx.setLineDash([]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(playheadX, height, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(playheadX, 0, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  }, [waveformData, loopStart, loopEnd, currentTime, duration, speakerTags]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (isLoopingRef.current && loopStartRef.current !== null && loopEndRef.current !== null) {
        const end = Math.max(loopStartRef.current, loopEndRef.current);
        if (audio.currentTime >= end - 0.05) {
          audio.currentTime = Math.min(loopStartRef.current, loopEndRef.current);
        }
      }
    };

    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => {
      if (isLoopingRef.current && loopStartRef.current !== null) {
        audio.currentTime = Math.min(loopStartRef.current, loopEndRef.current ?? loopStartRef.current);
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

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioFile]);

  // Update audio properties
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [playbackRate, volume, isMuted]);

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

  const eventToTime = useCallback((e: React.MouseEvent): number => {
    const canvas = waveformRef.current;
    if (!canvas || !duration) return 0;
    const rect = canvas.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    return fraction * duration;
  }, [duration]);

  const handleWaveformMouseDown = (e: React.MouseEvent) => {
    if (!duration) return;
    const t = eventToTime(e);
    setDragStartTime(t);
    setIsDragging(true);
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
    const end = Math.max(dragStartTime, t);

    if (end - start > 0.15) {
      setLoopStart(start);
      setLoopEnd(end);
      setIsLooping(true);
      if (audioRef.current) audioRef.current.currentTime = start;
    } else {
      if (audioRef.current) audioRef.current.currentTime = t;
      setLoopStart(null);
      setLoopEnd(null);
    }
    setDragStartTime(null);
  };

  const toggleLoop = () => {
    if (loopStart !== null && loopEnd !== null) {
      const next = !isLooping;
      setIsLooping(next);
      if (next && audioRef.current) {
        audioRef.current.currentTime = Math.min(loopStart, loopEnd);
      }
    }
  };

  const clearLoop = () => {
    setLoopStart(null);
    setLoopEnd(null);
    setIsLooping(false);
  };

  const handleSave = useCallback(() => {
    onSave?.({ transcriptEnglish, transcriptKrio, category, status, speakerTags });
    setHasUnsavedChanges(false);
    setLastSavedTime(new Date());
  }, [onSave, transcriptEnglish, transcriptKrio, category, status, speakerTags]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
        return;
      }

      const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName || "");
      if (isTyping) return;

      switch (e.key) {
        case " ": e.preventDefault(); togglePlayPause(); break;
        case "ArrowLeft": e.preventDefault(); e.shiftKey ? seekRelative(-5) : seekRelative(-1); break;
        case "ArrowRight": e.preventDefault(); e.shiftKey ? seekRelative(5) : seekRelative(1); break;
        case "l": case "L": e.preventDefault(); toggleLoop(); break;
        case "c": case "C": e.preventDefault(); clearLoop(); break;
        case "n": case "N": if (hasNext) onNext?.(); break;
        case "p": case "P": if (hasPrev) onPrev?.(); break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlayPause, seekRelative, handleSave, loopStart, loopEnd, isLooping, onNext, onPrev, hasNext, hasPrev]);

  const handleTranslate = async () => {
    try {
      setIsLoading(true);
      setTranscriptEnglish(await translateAi(transcriptKrio));
      setHasUnsavedChanges(true);
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
      setHasUnsavedChanges(true);
    } catch (err) {
      console.error("Transcription error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const addSpeakerTag = (label: string) => {
    if (!label.trim()) return;
    setSpeakerTags(prev => [...prev, { time: currentTime, label: label.trim() }].sort((a, b) => a.time - b.time));
    setHasUnsavedChanges(true);
  };

  const formatTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${m}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  const statusBadge = useMemo(() => {
    switch(status) {
      case "pending": return <Badge variant="secondary" className="bg-slate-200 text-slate-700 gap-1.5"><Clock className="w-3 h-3" /> Pending</Badge>;
      case "krio_done": return <Badge className="bg-blue-100 text-blue-700 gap-1.5 border-blue-200 hover:bg-blue-100"><MessageSquare className="w-3 h-3" /> Krio Done</Badge>;
      case "english_done": return <Badge className="bg-indigo-100 text-indigo-700 gap-1.5 border-indigo-200 hover:bg-indigo-100"><Languages className="w-3 h-3" /> English Done</Badge>;
      case "completed": return <Badge className="bg-green-100 text-green-700 gap-1.5 border-green-200 hover:bg-green-100"><CheckCircle2 className="w-3 h-3" /> Completed</Badge>;
      case "verified": return <Badge className="bg-purple-100 text-purple-700 gap-1.5 border-purple-200 hover:bg-purple-100"><Sparkles className="w-3 h-3" /> Verified</Badge>;
      default: return null;
    }
  }, [status]);

  return (
    <div className="h-[calc(100vh-65px)] flex flex-col bg-slate-50/50 dark:bg-slate-950/50 overflow-hidden">
      <audio ref={audioRef} src={audioFile.url} preload="metadata" />

      {/* Header Bar */}
      <div className="h-16 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-20">
        <div className="flex items-center gap-4 overflow-hidden">
          <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex flex-col">
            <h2 className="text-sm lg:text-base font-bold truncate max-w-[200px] sm:max-w-md">
              {audioFile.name}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              {statusBadge}
              <span className="text-[10px] text-muted-foreground font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Sheet >
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-700 h-9">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Krio Cheat Sheet</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className=" w-[50%] p-0 border-r-indigo-100">
              <div className="h-full flex flex-col ">
                <SheetHeader className="p-6 border-b bg-indigo-50/30">
                  <SheetTitle className="flex items-center gap-2 text-indigo-900">
                    <BookOpen className="w-5 h-5" />
                    Standardized Krio Glossary
                  </SheetTitle>
                  <p className="text-xs text-muted-foreground">
                    Quick reference for standardized spelling and common variations.
                  </p>
                  <div className="relative mt-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search Krio or English..." 
                      className="pl-9 bg-white border-indigo-100 focus-visible:ring-indigo-500"
                      value={cheatSheetSearch}
                      onChange={(e) => setCheatSheetSearch(e.target.value)}
                    />
                  </div>
                </SheetHeader>
                
                <ScrollArea className="flex-1 overflow-auto">
                  <div className="p-0">
                    <Table>
                      <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="w-[120px] font-bold text-indigo-900">Standardized</TableHead>
                          <TableHead className="w-[120px] font-medium">Variants</TableHead>
                          <TableHead className="font-medium">Meaning</TableHead>
                          <TableHead className="hidden md:table-cell font-medium">Example</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCheatSheet.map((item, idx) => (
                          <TableRow key={idx} className="hover:bg-indigo-50/50 transition-colors">
                            <TableCell className="font-bold text-indigo-700">{item.krio}</TableCell>
                            <TableCell className="text-xs text-slate-500 italic">{item.variant}</TableCell>
                            <TableCell className="text-sm">{item.meaning}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-slate-700 italic">"{item.example}"</span>
                                <span className="text-[10px] text-muted-foreground">{item.translation}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </div>
            </SheetContent>
          </Sheet>

          <div className="hidden sm:flex items-center gap-1 border rounded-lg p-1 bg-slate-100/50 dark:bg-slate-800/50">
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!hasPrev} onClick={onPrev}>
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!hasNext} onClick={onNext}>
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>
          
          <Button 
            onClick={handleSave} 
            className={cn(
              "gap-2 h-9 px-4 transition-all shadow-md",
              hasUnsavedChanges ? "bg-indigo-600 hover:bg-indigo-700 animate-pulse-subtle" : "bg-emerald-600 hover:bg-emerald-700"
            )}
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">{hasUnsavedChanges ? "Save Changes" : "Save"}</span>
          </Button>
          
          {onNext && hasNext && (
            <Button variant="outline" size="icon" onClick={onNext} className="h-9 w-9">
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
          
          {/* Left Side: Audio Player & Waveform */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-none p-2 dark:shadow-none bg-white dark:bg-slate-900 overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Music className="w-3.5 h-3.5" /> Waveform
                  </CardTitle>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6"><Info className="w-3.5 h-3.5 text-muted-foreground" /></Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Drag to select a loop region. Click to seek.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 p-1">
                <div className="relative group/wave">
                  <div className="absolute inset-0 bg-slate-900/5 dark:bg-slate-100/5 rounded-xl -m-2 blur-xl opacity-0 group-hover/wave:opacity-100 transition-opacity" />
                  <canvas
                    ref={waveformRef}
                    width={800}
                    height={180}
                    className="w-full bg-slate-800 h-40 lg:h-44 relative z-10 cursor-crosshair rounded-xl"
                    onMouseDown={handleWaveformMouseDown}
                    onMouseMove={handleWaveformMouseMove}
                    onMouseUp={handleWaveformMouseUp}
                  />
                  {waveformData.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl z-20">
                      <div className="flex flex-col items-center gap-2">
                        <RotateCcw className="w-6 h-6 animate-spin text-indigo-500" />
                        <span className="text-xs font-medium text-muted-foreground">Rendering…</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-center gap-6">
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-indigo-600" onClick={() => seekRelative(-5)}>
                      <SkipBack className="w-6 h-6" />
                    </Button>
                    <Button 
                      size="icon" 
                      className="h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none"
                      onClick={togglePlayPause}
                    >
                      {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-indigo-600" onClick={() => seekRelative(5)}>
                      <SkipForward className="w-6 h-6" />
                    </Button>
                  </div>
                  <span className="text-[18px] self-center text-muted-foreground font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                      <Gauge className="w-4 h-4 text-muted-foreground shrink-0" />
                      <Select value={playbackRate.toString()} onValueChange={(v) => setPlaybackRate(parseFloat(v))}>
                        <SelectTrigger className="h-8 border-none bg-transparent focus:ring-0 text-xs font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                            <SelectItem key={rate} value={rate.toString()}>{rate}x</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg group/volume">
                      <Button variant="ghost" size="icon" className="h-8 w-8 p-0 shrink-0" onClick={() => setIsMuted(!isMuted)}>
                        {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </Button>
                      <Slider
                        value={[isMuted ? 0 : volume * 100]}
                        max={100}
                        step={1}
                        onValueChange={([v]) => { setVolume(v / 100); if (v > 0) setIsMuted(false); }}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  {(loopStart !== null && loopEnd !== null) && (
                    <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/30 animate-in fade-in slide-in-from-top-2">
                      <RotateCcw className={cn("w-4 h-4 text-indigo-600", isLooping && "animate-spin-slow")} />
                      <div className="flex-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-400 font-mono">
                        {formatTime(Math.min(loopStart, loopEnd))} — {formatTime(Math.max(loopStart, loopEnd))}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant={isLooping ? "default" : "outline"} 
                          size="xs" 
                          className="h-7 text-[10px] font-bold px-3 rounded-lg"
                          onClick={toggleLoop}
                        >
                          {isLooping ? "Looping" : "Activate"}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-600" onClick={clearLoop}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Keyboard Shortcuts Card */}
            <Card className="border-none bg-slate-100/50 dark:bg-slate-900/30">
              <CardHeader className="py-3">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Keyboard className="w-3.5 h-3.5" /> Shortcuts
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-y-2 gap-x-4 pb-4">
                {[
                  { k: "Space", d: "Play/Pause" },
                  { k: "← / →", d: "Seek 1s" },
                  { k: "Shift + ← / →", d: "Seek 5s" },
                  { k: "L", d: "Toggle Loop" },
                  { k: "C", d: "Clear Loop" },
                  { k: "N / P", d: "Next/Prev File" },
                  { k: "Ctrl + S", d: "Save" },
                ].map(({ k, d }) => (
                  <div key={k} className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground font-medium">{d}</span>
                    <kbd className="px-1.5 py-0.5 rounded border bg-white dark:bg-slate-800 font-mono shadow-sm">{k}</kbd>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Side: Annotations & Speaker Tags */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Control Panel
                  </CardTitle>
                  {lastSavedTime && (
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                      <History className="w-3 h-3" />
                      Auto-saved at {lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Category</Label>
                    <Select value={category} onValueChange={(v) => { setCategory(v); setHasUnsavedChanges(true); }}>
                      <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-2xl">
                        {["conversation","monologue","interview","story","news","music","other"].map((v) => (
                          <SelectItem key={v} value={v} className="rounded-lg capitalize">{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Transcription Status</Label>
                    <Select value={status} onValueChange={(v) => { setStatus(v as typeof status); setHasUnsavedChanges(true); }}>
                      <SelectTrigger className="h-10 bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-2xl">
                        <SelectItem value="pending" className="rounded-lg"><div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-slate-400" /> Pending</div></SelectItem>
                        <SelectItem value="krio_done" className="rounded-lg"><div className="flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5 text-blue-400" /> Krio Done</div></SelectItem>
                        <SelectItem value="english_done" className="rounded-lg"><div className="flex items-center gap-2"><Languages className="w-3.5 h-3.5 text-indigo-400" /> English Done</div></SelectItem>
                        <SelectItem value="completed" className="rounded-lg"><div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Completed</div></SelectItem>
                        {isAdmin && (
                          <SelectItem value="verified" className="rounded-lg"><div className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-purple-500" /> Verified</div></SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator className="bg-slate-100 dark:bg-slate-800" />

                <div className="space-y-6">
                  {/* Krio Transcript Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold flex items-center gap-2">
                        Transcript (Krio)
                      </Label>
                      <Button 
                        size="xs" 
                        variant="secondary" 
                        className="h-8 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-100 dark:border-indigo-800 rounded-lg gap-2"
                        onClick={handleTranscribe}
                        disabled={isLoading}
                      >
                        <Sparkles className={cn("w-3.5 h-3.5", isLoading && "animate-pulse")} />
                        {isLoading ? "Analyzing..." : "AI Auto-Transcribe"}
                      </Button>
                    </div>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-indigo-600/5 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity" />
                      <Textarea
                        value={transcriptKrio}
                        placeholder="Listen and type the Krio transcription here…"
                        onChange={(e) => { setTranscriptKrio(e.target.value); setHasUnsavedChanges(true); }}
                        className="min-h-[140px] rounded-2xl bg-slate-50 dark:bg-slate-800/30 border-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 resize-none p-4 text-sm leading-relaxed relative z-10"
                      />
                    </div>
                  </div>

                  {/* English Transcript Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold flex items-center gap-2">
                        Transcript (English)
                      </Label>
                      <Button 
                        size="xs" 
                        variant="secondary" 
                        className="h-8 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-100 dark:border-purple-800 rounded-lg gap-2"
                        onClick={handleTranslate}
                        disabled={isLoading || !transcriptKrio}
                      >
                        <Languages className={cn("w-3.5 h-3.5", isLoading && "animate-pulse")} />
                        {isLoading ? "Translating..." : "AI Auto-Translate"}
                      </Button>
                    </div>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-purple-600/5 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity" />
                      <Textarea
                        value={transcriptEnglish}
                        placeholder="English translation will appear here or can be manually entered…"
                        onChange={(e) => { setTranscriptEnglish(e.target.value); setHasUnsavedChanges(true); }}
                        className="min-h-[140px] rounded-2xl bg-slate-50 dark:bg-slate-800/30 border-none focus-visible:ring-2 focus-visible:ring-purple-500/50 resize-none p-4 text-sm leading-relaxed relative z-10"
                      />
                    </div>
                  </div>
                </div>

                <Separator className="bg-slate-100 dark:bg-slate-800" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <UserPlus className="w-3.5 h-3.5" /> Speaker Tags
                    </Label>
                    <div className="flex gap-1.5">
                      {["Speaker A", "Speaker B", "Interviewer"].map(label => (
                        <Button 
                          key={label} 
                          variant="outline" 
                          size="xs" 
                          className="h-7 px-3 text-[10px] font-bold rounded-full border-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                          onClick={() => addSpeakerTag(label)}
                        >
                          + {label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add custom speaker label…"
                        className="h-9 bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl text-xs px-4"
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
                        size="sm"
                        className="h-9 rounded-xl px-4"
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
                    
                    <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      {speakerTags.length === 0 ? (
                        <div className="w-full text-center py-1">
                          <p className="text-[10px] text-muted-foreground italic flex items-center justify-center gap-2">
                            <Info className="w-3 h-3" /> No speaker tags yet. Position the playhead and click a label above.
                          </p>
                        </div>
                      ) : (
                        speakerTags.map((tag, i) => (
                          <Badge 
                            key={i} 
                            variant="secondary" 
                            className="gap-2 pl-1 pr-1.5 py-1 text-[10px] rounded-lg bg-white dark:bg-slate-800 border shadow-sm group/tag transition-all hover:border-indigo-300"
                          >
                            <span 
                              className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-mono font-bold cursor-pointer hover:bg-indigo-600 hover:text-white transition-colors"
                              onClick={() => { if (audioRef.current) audioRef.current.currentTime = tag.time; }}
                            >
                              {formatTime(tag.time)}
                            </span>
                            <span className="font-semibold">{tag.label}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-4 w-4 p-0 opacity-0 group-hover/tag:opacity-100 transition-opacity hover:text-red-500"
                              onClick={() => setSpeakerTags(prev => prev.filter((_, idx) => idx !== i))}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
              {hasUnsavedChanges && (
                <CardFooter className="py-3 bg-amber-50 dark:bg-amber-900/10 border-t border-amber-100 dark:border-amber-900/30 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest">Unsaved Changes Detected</p>
                </CardFooter>
              )}
            </Card>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.95; transform: scale(0.98); }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}