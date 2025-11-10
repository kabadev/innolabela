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
import { Music, Trash2, Upload, CheckCircle2, ArrowLeft } from "lucide-react";
import { SimpleAudioPlayer } from "./simple-audio-player";
import {
  addAudioToGroup,
  deleteAudio,
  getGroup,
  updateAudioAnnotations,
} from "@/app/actions";
import { Uploader } from "./uploader";
import { AssignGroupDialog } from "@/app/(admin)/components/assign-group-dialog";
import { useUser } from "@clerk/nextjs";
import { hasPermission, UserRole } from "@/lib/utils";

interface GroupDetailClientProps {
  initialGroup: AudioGroup;
}

export function GroupDetailClient({ initialGroup }: GroupDetailClientProps) {
  const router = useRouter();
  const { user } = useUser();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [group, setGroup] = useState<AudioGroup>(initialGroup);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [error, setError] = useState<string>("");
  const [selectedAudio, setSelectedAudio] =
    useState<AudioFileWithSegments | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

  // Read selected audio from URL on mount and when URL changes
  useEffect(() => {
    const audioId = searchParams.get("audio");
    if (audioId) {
      const audio = group.audioFiles.find((file) => file.id === audioId);
      if (audio) {
        setSelectedAudio(audio);
      }
    } else {
      setSelectedAudio(null);
    }
  }, [searchParams, group.audioFiles]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      const audioId = new URLSearchParams(window.location.search).get("audio");
      if (audioId) {
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
  }, [group.audioFiles]);

  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getAnnotatedCount = () => {
    return group.audioFiles.filter(
      (file) =>
        file.annotations &&
        (file.annotations.transcriptEnglish ||
          file.annotations.transcriptKrio ||
          file.annotations.category)
    ).length;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const audioFiles = files.filter((file) => file.type.startsWith("audio/"));

    if (audioFiles.length + group.audioFiles.length > 100) {
      setError(
        `Cannot add ${audioFiles.length} files. Group limit is 100 files (currently ${group.audioFiles.length})`
      );
      return;
    }

    setSelectedFiles(audioFiles);
    setError("");
  };

  const handleAddFiles = async () => {
    if (uploadedUrls.length === 0) return;

    setIsAdding(true);

    try {
      const audioFilesWithMetadata = await Promise.all(
        uploadedUrls.map(async (url) => {
          const filename = url.split("/").pop() || "audio.mp3";
          const audio = new Audio(url);

          return new Promise<AudioFile>((resolve, reject) => {
            audio.addEventListener("loadedmetadata", () => {
              resolve({
                id: `audio-${Date.now()}-${Math.random()}`,
                file: null!,
                url,
                name: filename,
                duration: audio.duration,
              });
            });

            audio.addEventListener("error", () => {
              reject(new Error(`Failed to load audio: ${filename}`));
            });

            setTimeout(() => {
              reject(new Error(`Timeout loading audio: ${filename}`));
            }, 10000);
          });
        })
      );

      for (const audioFile of audioFilesWithMetadata) {
        const fileWithSegments: AudioFileWithSegments = {
          ...audioFile,
          groupId: group.id,
          annotations: {
            transcriptEnglish: "",
            transcriptKrio: "",
            category: "",
          },
        };

        const groupRes: any = await addAudioToGroup(group.id, fileWithSegments);

        setGroup(groupRes!);
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
    if (!selectedAudio) return;

    try {
      await updateAudioAnnotations(group.id, selectedAudio.id, annotations);

      setGroup((prev) => ({
        ...prev,
        audioFiles: prev.audioFiles.map((file) =>
          file.id === selectedAudio.id ? { ...file, annotations } : file
        ),
      }));

      setSelectedAudio((prev) => (prev ? { ...prev, annotations } : null));
    } catch (err) {
      console.error("Failed to save annotations:", err);
    }
  };

  const handleDeleteAudio = async (audioId: string) => {
    try {
      await deleteAudio(group.id, audioId);

      setGroup((prev) => ({
        ...prev,
        audioFiles: prev.audioFiles.filter((file) => file.id !== audioId),
      }));

      if (selectedAudio?.id === audioId) {
        handleClosePlayer();
      }
    } catch (err) {
      console.error("Failed to delete audio:", err);
    }
  };

  const isAnnotated = (file: AudioFileWithSegments) => {
    return file.annotations && file.annotations.transcriptKrio;
  };

  return (
    <div className=" flex flex-col lg:flex-row">
      {/* Left Sidebar - Audio List - Hidden on mobile when audio is selected */}
      <div
        className={`${
          selectedAudio ? "hidden lg:flex" : "flex"
        } w-full lg:w-80 border-r flex-col bg-muted/30`}
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
          {user &&
          hasPermission(user?.publicMetadata?.role as UserRole, [
            "Admin",
            // "Supervisor",
            "Project Lead",
            // "Technical Lead",
          ]) ? (
            <div className="flex items-center justify-between mb-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowUploadModal(true)}
                disabled={group.audioFiles.length >= 100}
                className="flex-1"
              >
                <Upload className="w-3 h-3 mr-1" />
                Add Files
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-6"></div>
          )}

          <p className="text-xs text-muted-foreground">
            {group.audioFiles.length} / 100 files • {getAnnotatedCount()}{" "}
            annotated
          </p>
          <div className="w-full bg-muted rounded-full h-1.5 mt-2">
            <div
              className="bg-primary rounded-full h-1.5 transition-all"
              style={{ width: `${(group.audioFiles.length / 100) * 100}%` }}
            />
          </div>
        </div>

        <div className="  overflow-y-auto">
          {group.audioFiles.length === 0 ? (
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
            <div className="p-2 space-y-1 h-[calc(100vh-220px)] overflow-y-auto">
              {group.audioFiles.map((file) => (
                <div
                  key={file.id}
                  className={`p-3 rounded-lg cursor-pointer transition-all group hover:bg-background ${
                    selectedAudio?.id === file.id
                      ? "bg-background shadow-sm border border-primary/50"
                      : ""
                  }`}
                  onClick={() => handleAudioClick(file)}
                >
                  <div className="flex items-start gap-2">
                    <Music className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {file.annotations?.transcriptKrio || file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(file.duration)}
                      </p>
                      {isAnnotated(file) && (
                        <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Annotated
                        </div>
                      )}
                    </div>

                    {user &&
                      hasPermission(user?.publicMetadata?.role as UserRole, [
                        "Admin",
                        // "Supervisor",
                        "Project Lead",
                        // "Technical Lead",
                      ]) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete "${file.name}"?`)) {
                              handleDeleteAudio(file.id);
                            }
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                  </div>
                </div>
              ))}
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
