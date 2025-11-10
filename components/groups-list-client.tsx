"use client";

import type React from "react";
import { useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AudioGroup, AudioFile } from "./audio-annotation-system";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, Music, Trash2, Plus } from "lucide-react";
import { assignUserToGroup, createGroup, deleteGroup } from "@/app/actions";
import { Uploader } from "@/components/uploader";
import { AssignGroupDialog } from "@/app/(admin)/components/assign-group-dialog";
import { User } from "@/lib/type";
import { useUser } from "@clerk/nextjs";
import { hasPermission, UserRole } from "@/lib/utils";

interface GroupsListClientProps {
  users?: any;
  initialGroups: AudioGroup[];
}

export function GroupsListClient({
  initialGroups,
  users,
}: GroupsListClientProps) {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [groups, setGroups] = useState<AudioGroup[]>(initialGroups);
  const [assignLoading, setAssignLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const uploaderRef = useRef<{ reset: () => void }>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getAnnotatedCount = (group: AudioGroup) => {
    return group.audioFiles.filter(
      (file) =>
        file.annotations &&
        (file.annotations.transcriptEnglish ||
          file.annotations.transcriptKrio ||
          file.annotations.category)
    ).length;
  };

  // const handleUploadComplete = (urls: string[] | string) => {
  //   const urlArray = Array.isArray(urls) ? urls : urls ? [urls] : [];

  //   // Filter out blob URLs - only accept actual S3 URLs (they should contain your S3 domain)
  //   const s3Urls = urlArray.filter((url) => {
  //     return (
  //       !url.startsWith("blob:") &&
  //       (url.startsWith("https://") || url.startsWith("http://"))
  //     );
  //   });

  //   if (s3Urls.length > 100) {
  //     setError(
  //       `Cannot add ${s3Urls.length} files. Maximum 100 files per group.`
  //     );
  //     return;
  //   }

  //   setUploadedUrls(s3Urls);

  //   if (s3Urls.length > 0) {
  //     setError("");
  //   }
  // };

  const handleCreateGroup = async () => {
    if (uploadedUrls.length === 0) {
      setError("Please upload audio files first");
      return;
    }

    setIsCreating(true);

    try {
      // Create AudioFile objects from uploaded URLs
      const audioFilesWithMetadata = await Promise.all(
        uploadedUrls.map(async (url) => {
          const filename = url.split("/").pop() || "audio.mp3";
          const audio = new Audio(url);

          return new Promise<AudioFile>((resolve, reject) => {
            audio.addEventListener("loadedmetadata", () => {
              resolve({
                id: `audio-${Date.now()}-${Math.random()}`,
                file: null!, // File object not available for uploaded files
                url,
                name: filename,
                duration: audio.duration,
              });
            });

            audio.addEventListener("error", () => {
              reject(new Error(`Failed to load audio: ${filename}`));
            });

            // Set a timeout in case metadata never loads
            setTimeout(() => {
              reject(new Error(`Timeout loading audio: ${filename}`));
            }, 10000);
          });
        })
      );

      const filesWithSegments = audioFilesWithMetadata.map((file) => ({
        ...file,
        groupId: "",
        annotations: {
          transcriptEnglish: "",
          transcriptKrio: "",
          category: "",
        },
      }));

      const newGroup = await createGroup(
        `Group ${groups.length + 1}`,
        filesWithSegments
      );

      setGroups((prev: any) => [...prev, newGroup]);
      setUploadedUrls([]);
      setShowModal(false);

      // Reset the uploader
      uploaderRef.current?.reset();
      if (pathname === "/controls/groups") {
        router.push(`/controls/groups/${newGroup.id}`);
      } else {
        router.push(`/groups/${newGroup.id}`);
      }
    } catch (err) {
      console.error("Create group error:", err);
      setError("Failed to create group. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteGroup(groupId);
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
    } catch (err) {
      console.error("Failed to delete group:", err);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setUploadedUrls([]);
    setError("");
    uploaderRef.current?.reset();
  };

  const handleAssign = async (userId: string, groupId: string) => {
    try {
      setAssignLoading(true);
      const result = await assignUserToGroup(userId, groupId);
      setShowAssignDialog(false);
      router.refresh();
      setAssignLoading(false);
    } catch (error) {
      setAssignLoading(false);
    }
  };
  return (
    <div className="h-full flex flex-col">
      <div className="p-2 md:p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Audio Groups</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {groups.length} {groups.length === 1 ? "group" : "groups"}
            </p>
          </div>

          {user &&
            hasPermission(user?.publicMetadata?.role as UserRole, [
              "Admin",
              "Project Lead",
              "Technical Lead",
              // "Annotators"
            ]) && (
              <div className="flex items-center gap-2">
                <Button
                  variant={"outline"}
                  onClick={() => setShowAssignDialog(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Assign Group
                </Button>
                <Button onClick={() => setShowModal(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Group
                </Button>
              </div>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {groups.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                No audio groups available
              </h3>
              <p className="text-sm mb-4">
                {user &&
                hasPermission(user?.publicMetadata?.role as UserRole, [
                  "Admin",
                  "Project Lead",
                  "Technical Lead",
                  // "Annotators"
                ])
                  ? "Get started by creating your first audio group."
                  : "Please contact your administrator to assign audio groups to you."}
              </p>
              {user &&
                hasPermission(user?.publicMetadata?.role as UserRole, [
                  "Admin",
                  "Project Lead",
                  "Technical Lead",
                  // "Annotators"
                ]) && (
                  <Button onClick={() => setShowModal(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Group
                  </Button>
                )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <Card
                key={group.id}
                className="p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary/50 group"
                onClick={() =>
                  pathname === "/controls/groups"
                    ? router.push(`/controls/groups/${group.id}`)
                    : router.push(`/groups/${group.id}`)
                }
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">{group.name}</h3>
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
                          if (
                            confirm(
                              `Delete group "${group.name}"? This will remove all audio files in this group.`
                            )
                          ) {
                            handleDeleteGroup(group.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Music className="w-4 h-4" />
                    <span>{group.audioFiles.length} / 100 audio files</span>
                  </div>

                  <div className="text-muted-foreground">
                    Added: {formatDate(group.dateAdded)}
                  </div>

                  {getAnnotatedCount(group) > 0 && (
                    <div className="text-green-600 text-xs">
                      ✓ {getAnnotatedCount(group)} annotated
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t">
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{
                        width: `${(group.audioFiles.length / 100) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 text-center">
                    {100 - group.audioFiles.length} slots remaining
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Create New Group</h3>

            <Uploader
              // ref={uploaderRef}
              multiple={true}
              accept={{ "audio/*": [] }}
              // onUploadComplete={handleUploadComplete}
              onUploadComplete={(urls: string[]) => {
                console.log("Urles:s", urls);
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
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  ✓ {uploadedUrls.length} file
                  {uploadedUrls.length !== 1 ? "s" : ""} uploaded successfully
                </p>
                <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                  Maximum 100 audio files per group
                </p>
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleModalClose}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreateGroup}
                disabled={uploadedUrls.length === 0 || isCreating}
              >
                {isCreating
                  ? "Creating..."
                  : `Create Group with ${uploadedUrls.length} Files`}
              </Button>
            </div>
          </Card>
        </div>
      )}

      <AssignGroupDialog
        users={users!}
        groups={initialGroups}
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        onAssign={handleAssign}
        loading={assignLoading}
      />
    </div>
  );
}
