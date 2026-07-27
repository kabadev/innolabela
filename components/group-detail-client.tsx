"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  AudioGroup,
  AudioFileWithSegments,
  AudioFile,
  AudioAnnotations,
} from "./audio-annotation-system";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, Trash2, Upload, CheckCircle2, ArrowLeft, Download, Wand2, FileJson, FileText, FileCode, Search, Archive, Loader2 } from "lucide-react";
import JSZip from "jszip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SimpleAudioPlayer } from "./simple-audio-player";
import {
  addAudioToGroup,
  deleteAudio,
  getGroup,
  updateAudioAnnotations,
} from "@/app/actions";
import { translateAi, transscribeKrioAi } from "@/app/transcribe";
import { Uploader } from "./uploader";
import { AssignGroupDialog } from "@/app/(admin)/components/assign-group-dialog";
import { useUser } from "@clerk/nextjs";
import { cn, hasPermission, UserRole } from "@/lib/utils";
import { toast } from "sonner";

interface GroupDetailClientProps {
  initialGroup: AudioGroup | null;
  initialGlossary?: any[];
}

export function GroupDetailClient({ initialGroup, initialGlossary = [] }: GroupDetailClientProps) {
  const router = useRouter();
  const { user } = useUser();
  const isAdmin = user && hasPermission(user.publicMetadata?.role as UserRole, ["Admin", "Project Lead"]);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [group, setGroup] = useState<AudioGroup | null>(initialGroup);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [error, setError] = useState<string>("");
  const [selectedAudio, setSelectedAudio] =
    useState<AudioFileWithSegments | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [isExportingZip, setIsExportingZip] = useState(false);

  // Read selected audio from URL on mount and when URL changes
  useEffect(() => {
    const audioId = searchParams.get("audio");
    if (audioId && group?.audioFiles) {
      const audio = group.audioFiles.find((file) => file.id === audioId);
      if (audio) {
        setSelectedAudio(audio);
      }
    } else {
      setSelectedAudio(null);
    }
  }, [searchParams, group?.audioFiles]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      const audioId = new URLSearchParams(window.location.search).get("audio");
      if (audioId && group?.audioFiles) {
        const audio = group.audioFiles.find((file) => file.id === audioId);
        if (audio) {
          setSelectedAudio(audio);
        }
      } else {
        setSelectedAudio(null);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [group?.audioFiles]);

  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getAnnotatedCount = () => {
    if (!group?.audioFiles) return 0;
    return group.audioFiles.filter(
      (file) =>
        file.annotations &&
        (file.annotations.status === "completed" ||
          file.annotations.status === "verified")
    ).length;
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "krio_done": return "bg-blue-400";
      case "english_done": return "bg-indigo-400";
      case "completed": return "bg-green-500";
      case "verified": return "bg-purple-500";
      default: return "bg-slate-300";
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case "krio_done": return "Krio";
      case "english_done": return "English";
      case "completed": return "Done";
      case "verified": return "Verified";
      default: return "Pending";
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const audioFiles = files.filter((file) => file.type.startsWith("audio/"));
    const currentCount = group?.audioFiles?.length || 0;

    if (audioFiles.length + currentCount > 100) {
      setError(
        `Cannot add ${audioFiles.length} files. Group limit is 100 files (currently ${currentCount})`
      );
      return;
    }

    setSelectedFiles(audioFiles);
    setError("");
  };

  const handleAddFiles = async () => {
    if (uploadedUrls.length === 0 || !group) return;

    setIsAdding(true);

    try {
      for (const url of uploadedUrls) {
        const filename = url.split("/").pop() || "audio.mp3";
        const fileWithSegments: any = {
          name: filename,
          url,
          duration: 20,
          groupId: group.id,
          annotations: {
            transcriptEnglish: "",
            transcriptKrio: "",
            category: "",
            status: "pending",
            speakerTags: [],
          },
        };

        const groupRes: any = await addAudioToGroup(group.id, fileWithSegments);

        if (groupRes) {
          setGroup(groupRes);
        }
      }

      router.refresh();
      setSelectedFiles([]);
      setShowUploadModal(false);
      setUploadedUrls([]);
    } catch (err) {
      setError("Failed to add files. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleAudioClick = (audio: AudioFileWithSegments) => {
    setSelectedAudio(audio);
    // Update URL with selected audio ID
    const params = new URLSearchParams(searchParams.toString());
    params.set("audio", audio.id);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleClosePlayer = () => {
    setSelectedAudio(null);
    // Remove audio param from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete("audio");
    const newUrl = params.toString()
      ? `?${params.toString()}`
      : window.location.pathname;
    router.push(newUrl, { scroll: false });
  };

  const handleSaveAnnotations = async (annotations: AudioAnnotations) => {
    if (!selectedAudio || !group) return;

    try {
      await updateAudioAnnotations(group.id, selectedAudio.id, annotations);

      setGroup((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          audioFiles: (prev.audioFiles || []).map((file) =>
            file.id === selectedAudio.id ? { ...file, annotations } : file
          ),
        };
      });

      setSelectedAudio((prev) => (prev ? { ...prev, annotations } : null));
    } catch (err) {
      console.error("Failed to save annotations:", err);
    }
  };

  const handleDeleteAudio = async (audioId: string) => {
    if (!group) return;
    try {
      await deleteAudio(group.id, audioId);

      setGroup((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          audioFiles: (prev.audioFiles || []).filter((file) => file.id !== audioId),
        };
      });

      if (selectedAudio?.id === audioId) {
        handleClosePlayer();
      }
    } catch (err) {
      console.error("Failed to delete audio:", err);
    }
  };

  const isAnnotated = (file: AudioFileWithSegments) => {
    return file.annotations && (file.annotations.status === "completed" || file.annotations.status === "verified");
  };

  // ─── Export Helpers ───────────────────────────────────────────────────────
  const exportToJSON = () => {
    if (!group) return;
    const data = {
      groupName: group.name,
      groupId: group.id,
      assignedTo: group.assigned,
      exportedAt: new Date().toISOString(),
      files: (group.audioFiles || []).map(f => ({
        id: f.id,
        name: f.name,
        url: f.url,
        duration: f.duration,
        groupId: f.groupId || group.id,
        groupName: group.name,
        category: f.annotations?.category || "",
        status: f.annotations?.status || "pending",
        transcriptKrio: f.annotations?.transcriptKrio || "",
        transcriptEnglish: f.annotations?.transcriptEnglish || "",
        speakerTags: f.annotations?.speakerTags || [],
        annotations: f.annotations || {}
      }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${group.name}_annotations.json`;
    link.click();
  };

  const exportToCSV = () => {
    if (!group) return;
    const headers = [
      "ID",
      "Name",
      "URL",
      "Duration",
      "Group ID",
      "Group Name",
      "Category",
      "Status",
      "Krio Transcript",
      "English Transcript",
      "Speaker Tags"
    ];
    const rows = (group.audioFiles || []).map(f => [
      `"${f.id || ""}"`,
      `"${(f.name || "").replace(/"/g, '""')}"`,
      `"${(f.url || "").replace(/"/g, '""')}"`,
      f.duration || 0,
      `"${f.groupId || group.id || ""}"`,
      `"${(group.name || "").replace(/"/g, '""')}"`,
      `"${(f.annotations?.category || "").replace(/"/g, '""')}"`,
      `"${(f.annotations?.status || "").replace(/"/g, '""')}"`,
      `"${(f.annotations?.transcriptKrio || "").replace(/"/g, '""')}"`,
      `"${(f.annotations?.transcriptEnglish || "").replace(/"/g, '""')}"`,
      `"${(f.annotations?.speakerTags?.map(s => `[${s.time}s: ${s.label}]`).join("; ") || "").replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${group.name}_annotations.csv`;
    link.click();
  };

  const exportToSRT = () => {
    if (!group) return;
    let srtContent = "";
    (group.audioFiles || []).forEach((f, i) => {
      if (f.annotations?.transcriptEnglish || f.annotations?.transcriptKrio) {
        const text = f.annotations.transcriptEnglish || f.annotations.transcriptKrio;
        srtContent += `${i + 1}\n`;
        srtContent += `00:00:00,000 --> ${new Date((f.duration || 20) * 1000).toISOString().substr(11, 12).replace('.', ',')}\n`;
        srtContent += `${text}\n\n`;
      }
    });
    const blob = new Blob([srtContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${group.name}_annotations.srt`;
    link.click();
  };

  const exportToZip = async () => {
    if (isExportingZip || !group) return;
    setIsExportingZip(true);
    const toastId = toast.loading(`Preparing offline dataset for ${group.name}...`);
    const groupAudioFiles = group.audioFiles || [];

    try {
      const zip = new JSZip();
      const audioFolder = zip.folder("audios");
      
      // 1. Add JSON data with all fields
      const jsonData = {
        groupName: group.name,
        groupId: group.id,
        assignedTo: group.assigned,
        exportedAt: new Date().toISOString(),
        files: groupAudioFiles.map(f => ({
          id: f.id,
          name: f.name,
          url: f.url,
          duration: f.duration,
          groupId: f.groupId || group.id,
          groupName: group.name,
          category: f.annotations?.category || "",
          status: f.annotations?.status || "pending",
          transcriptKrio: f.annotations?.transcriptKrio || "",
          transcriptEnglish: f.annotations?.transcriptEnglish || "",
          speakerTags: f.annotations?.speakerTags || [],
          annotations: f.annotations || {},
          localPath: `audios/${f.name}`
        }))
      };
      zip.file("dataset.json", JSON.stringify(jsonData, null, 2));

      // 2. Add CSV data with all fields
      const headers = [
        "ID",
        "Name",
        "URL",
        "Duration",
        "Group ID",
        "Group Name",
        "Category",
        "Status",
        "Krio Transcript",
        "English Transcript",
        "Speaker Tags",
        "Local Path"
      ];
      const rows = groupAudioFiles.map(f => [
        `"${f.id || ""}"`,
        `"${(f.name || "").replace(/"/g, '""')}"`,
        `"${(f.url || "").replace(/"/g, '""')}"`,
        f.duration || 0,
        `"${f.groupId || group.id || ""}"`,
        `"${(group.name || "").replace(/"/g, '""')}"`,
        `"${(f.annotations?.category || "").replace(/"/g, '""')}"`,
        `"${(f.annotations?.status || "").replace(/"/g, '""')}"`,
        `"${(f.annotations?.transcriptKrio || "").replace(/"/g, '""')}"`,
        `"${(f.annotations?.transcriptEnglish || "").replace(/"/g, '""')}"`,
        `"${(f.annotations?.speakerTags?.map(s => `[${s.time}s: ${s.label}]`).join("; ") || "").replace(/"/g, '""')}"`,
        `"audios/${f.name}"`
      ]);
      const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      zip.file("dataset.csv", csvContent);

      // 3. Add Audio files
      console.log(`Starting to download ${groupAudioFiles.length} audio files...`);
      const downloadPromises = groupAudioFiles.map(async (f) => {
        try {
          const response = await fetch(f.url);
          if (!response.ok) throw new Error(`Failed to fetch ${f.name}`);
          const blob = await response.blob();
          audioFolder?.file(f.name, blob);
        } catch (err) {
          console.error(`Error downloading ${f.name}:`, err);
        }
      });

      await Promise.all(downloadPromises);

      // 4. Generate and download zip
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${group.name}_offline_dataset.zip`;
      link.click();
      
      toast.success("Offline dataset downloaded successfully", { id: toastId });
    } catch (error) {
      console.error("Zip export error:", error);
      toast.error("Failed to generate offline dataset", { id: toastId });
    } finally {
      setIsExportingZip(false);
    }
  };

  // ─── Batch AI Processing ──────────────────────────────────────────────────
  const handleBatchTranscribe = async () => {
    if (!group) return;
    if (!confirm("This will transcribe all unannotated files in this group. Continue?")) return;
    
    setIsBatchProcessing(true);
    try {
      const unannotatedFiles = (group.audioFiles || []).filter(f => !f.annotations?.transcriptKrio);
      
      for (const file of unannotatedFiles) {
        const krio = await transscribeKrioAi(file.url);
        const english = await translateAi(krio);
        
        const newAnnotations: AudioAnnotations = {
          ...file.annotations!,
          transcriptKrio: krio,
          transcriptEnglish: english,
          status: "completed"
        };
        
        await updateAudioAnnotations(group.id, file.id, newAnnotations);
      }
      
      // Refresh group data
      const updatedGroup = await getGroup(group.id);
      if (updatedGroup) setGroup(updatedGroup);
      
      router.refresh();
      toast.success(`Batch transcription complete for ${unannotatedFiles.length} files.`);
    } catch (err) {
      console.error("Batch transcription error:", err);
      toast.error("An error occurred during batch transcription.");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const groupAudioFiles = group?.audioFiles || [];

  const filteredAudioFiles = groupAudioFiles.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.annotations?.transcriptKrio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.annotations?.transcriptEnglish?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!group) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground">
        <p>Audio group not found or loading...</p>
      </div>
    );
  }

  return (
    <div className=" flex flex-col lg:flex-row">
      {/* Left Sidebar - Audio List - Hidden on mobile when audio is selected */}
      <div
        className={`${
          selectedAudio ? "hidden lg:flex" : "flex"
        } w-full lg:w-80 border-r flex-col bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-xl z-10 transition-all`}
      >
        <div className="p-4 border-b ">
          <div className="flex items-center gap-2 mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                pathname.startsWith("/groups")
                  ? router.push("/groups")
                  : router.push("/controls/groups")
              }
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h3 className="font-semibold">Audio Files</h3>
          </div>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                className="pl-9 h-9 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1 text-xs">
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={exportToJSON}>
                    <FileJson className="w-4 h-4 mr-2" /> JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToCSV}>
                    <FileText className="w-4 h-4 mr-2" /> CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToSRT}>
                    <FileCode className="w-4 h-4 mr-2" /> SRT (Subtitles)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToZip} disabled={isExportingZip}>
                    {isExportingZip ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Archive className="w-4 h-4 mr-2" />
                    )}
                    ZIP (Offline Dataset)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                onClick={handleBatchTranscribe}
                disabled={isBatchProcessing}
              >
                <Wand2 className={`w-3.5 h-3.5 mr-1.5 ${isBatchProcessing ? 'animate-spin' : ''}`} />
                {isBatchProcessing ? "Processing..." : "AI All"}
              </Button>
            </div>

            {user &&
            hasPermission(user?.publicMetadata?.role as UserRole, [
              "Admin",
              "Project Lead",
            ]) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowUploadModal(true)}
                disabled={groupAudioFiles.length >= 100}
                className="w-full text-xs"
              >
                <Upload className="w-3 h-3 mr-1" />
                Add Files
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2 px-1">
            <span className="font-medium">{groupAudioFiles.length} / 100 files</span>
            <span className="font-medium text-indigo-600">{getAnnotatedCount()} annotated</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden shadow-inner">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full h-full transition-all duration-500 ease-out"
              style={{ width: `${(groupAudioFiles.length / 100) * 100}%` }}
            />
          </div>
        </div>

        <div className="  overflow-y-auto">
          {groupAudioFiles.length === 0 ? (
            <div className="h-[calc(100vh-220px)] overflow-y-auto flex items-center justify-center p-4">
              <div className="text-center text-muted-foreground">
                <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm mb-3">No audio files</p>
                {user &&
                  hasPermission(user?.publicMetadata?.role as UserRole, [
                    "Admin",
                    // "Supervisor",
                    "Project Lead",
                    "Technical Lead",
                  ]) && (
                    <Button
                      variant="outline"
                      onClick={() => setShowUploadModal(true)}
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      Add Audio Files
                    </Button>
                  )}
              </div>
            </div>
          ) : (
            <div className="p-3 space-y-2 h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar">
              {filteredAudioFiles.map((file) => {
                const isActive = selectedAudio?.id === file.id;
                const isDone = isAnnotated(file);
                
                return (
                  <div
                    key={file.id}
                    className={cn(
                      "group p-3 rounded-xl cursor-pointer transition-all duration-200 border relative overflow-hidden",
                      isActive 
                        ? "bg-white dark:bg-slate-800 shadow-md border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-500/10" 
                        : "bg-transparent border-transparent hover:bg-white/60 dark:hover:bg-slate-800/40 hover:border-slate-200 dark:hover:border-slate-700"
                    )}
                    onClick={() => handleAudioClick(file)}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full" />
                    )}
                    
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-2 rounded-lg transition-colors",
                        isActive ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 group-hover:text-indigo-500"
                      )}>
                        <Music className="w-4 h-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-xs font-bold truncate transition-colors",
                          isActive ? "text-indigo-900 dark:text-indigo-100" : "text-slate-700 dark:text-slate-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-300"
                        )}>
                          {file.annotations?.transcriptKrio || file.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono text-slate-400">
                            {formatDuration(file.duration)}
                          </span>
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            getStatusColor(file.annotations?.status)
                          )} />
                          <span className="text-[10px] font-medium text-slate-400 capitalize">
                            {getStatusLabel(file.annotations?.status)}
                          </span>
                        </div>
                      </div>

                      {user && isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete "${file.name}"?`)) {
                              handleDeleteAudio(file.id);
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    
                    {/* Progress indicator for small items */}
                    {isDone && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500/20">
                        <div className="h-full bg-green-500 w-full" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Audio Player - Full screen on mobile, side-by-side on desktop */}
      <div
        className={`w-full md:w-[calc(100%-20rem)] ${
          selectedAudio ? "flex" : "hidden lg:flex"
        }  overflow-y-auto flex-col `}
      >
        {selectedAudio ? (
          <SimpleAudioPlayer
            audioFile={selectedAudio}
            onSave={handleSaveAnnotations}
            onClose={handleClosePlayer}
            onNext={() => {
              const idx = groupAudioFiles.findIndex(f => f.id === selectedAudio.id);
              if (idx >= 0 && idx < groupAudioFiles.length - 1) handleAudioClick(groupAudioFiles[idx + 1]);
            }}
            onPrev={() => {
              const idx = groupAudioFiles.findIndex(f => f.id === selectedAudio.id);
              if (idx > 0) handleAudioClick(groupAudioFiles[idx - 1]);
            }}
            hasNext={groupAudioFiles.findIndex(f => f.id === selectedAudio.id) < groupAudioFiles.length - 1}
            hasPrev={groupAudioFiles.findIndex(f => f.id === selectedAudio.id) > 0}
            initialGlossary={initialGlossary}
          />
        ) : (
          <div className="h-[calc(100vh-65px)] w-full  flex items-center justify-center text-muted-foreground">
            <div className="text-center w-full">
              <Music className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No audio selected</h3>
              <p className="text-sm">
                Select an audio file from the sidebar to start annotating
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl p-4 lg:p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              Add Audio Files to {group.name}
            </h3>

            <Uploader
              multiple={true}
              accept={{ "audio/*": [] }}
              onUploadComplete={(urls: string[]) => {
                console.log("Uploaded URLs:", urls);
                setUploadedUrls(urls);
              }}
              uploadTitle="Drag and drop audio files or click to browse"
              maxSizeMB={50}
              className="min-h-[200px]"
            />

            {error && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive rounded-lg text-destructive text-sm">
                {error}
              </div>
            )}

            {uploadedUrls.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">
                  Selected Files ({uploadedUrls.length})
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {uploadedUrls.map((file, index) => (
                    <div
                      key={index}
                      className="text-sm text-muted-foreground flex items-center gap-2"
                    >
                      <Music className="w-4 h-4" />
                      {file.split("/").pop()}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                className="flex-1 bg-transparent"
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFiles([]);
                  setUploadedUrls([]);
                  setError("");
                }}
                disabled={isAdding}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleAddFiles}
                disabled={uploadedUrls.length === 0 || isAdding}
              >
                {isAdding ? "Adding..." : `Add ${uploadedUrls.length} Files`}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
