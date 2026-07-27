"use client";

import type React from "react";
import { useState, useRef, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AudioGroup, AudioFile } from "./audio-annotation-system";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FolderOpen, 
  Music, 
  Trash2, 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  ChevronDown,
  SortAsc,
  SortDesc,
  LayoutGrid,
  List as ListIcon,
  CheckCircle2,
  FileAudio
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { assignUserToGroup, createGroup, deleteGroup } from "@/app/actions";
import { Uploader } from "@/components/uploader";
import { AssignGroupDialog } from "@/app/(admin)/components/assign-group-dialog";
import { useUser } from "@clerk/nextjs";
import { hasPermission, UserRole } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface GroupsListClientProps {
  users?: any;
  initialGroups: AudioGroup[];
}

type SortOption = "newest" | "oldest" | "name" | "files";

export function GroupsListClient({
  initialGroups,
  users,
}: GroupsListClientProps) {
  const { user } = useUser();
  const isAdmin = user && hasPermission(user.publicMetadata?.role as UserRole, ["Admin", "Project Lead"]);
  const router = useRouter();
  const pathname = usePathname();
  const [groups, setGroups] = useState<AudioGroup[]>(initialGroups);
  const [assignLoading, setAssignLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [viewType, setViewType] = useState<"grid" | "list">("grid");
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

  const handleCreateGroup = async () => {
    if (uploadedUrls.length === 0) {
      setError("Please upload audio files first");
      return;
    }

    setIsCreating(true);

    try {
      const filesData = uploadedUrls.map((url) => {
        const filename = url.split("/").pop() || "audio.mp3";
        return {
          name: filename,
          url,
          duration: 20,
          annotations: {
            transcriptEnglish: "",
            transcriptKrio: "",
            category: "",
            status: "pending" as const,
            speakerTags: [],
          },
        };
      });

      const newGroup = await createGroup(
        `Group ${groups.length + 1}`,
        filesData
      );

      setGroups((prev: any) => [...prev, newGroup]);
      setUploadedUrls([]);
      setShowModal(false);

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

  const sortedAndFilteredGroups = useMemo(() => {
    let result = groups.filter((g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    result.sort((a, b) => {
      const dateA = new Date(a.dateAdded).getTime();
      const dateB = new Date(b.dateAdded).getTime();

      switch (sortOption) {
        case "newest":
          return dateB - dateA;
        case "oldest":
          return dateA - dateB;
        case "name":
          return a.name.localeCompare(b.name);
        case "files":
          return b.audioFiles.length - a.audioFiles.length;
        default:
          return 0;
      }
    });

    return result;
  }, [groups, searchQuery, sortOption]);

  const canManageGroups = user && hasPermission(user?.publicMetadata?.role as UserRole, [
    "Admin",
    "Project Lead",
    "Technical Lead",
  ]);

  return (
    <div className="h-full flex flex-col bg-background/50">
      <div className="p-4 md:p-6 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex flex-col space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Audio Groups
              </h2>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                {sortedAndFilteredGroups.length} {sortedAndFilteredGroups.length === 1 ? "group" : "groups"} in total
              </p>
            </div>

            <div className="flex items-center gap-3">
              {canManageGroups && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowAssignDialog(true)}
                    className="hidden sm:flex hover:bg-primary/5 hover:text-primary border-primary/20"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Assign Group
                  </Button>
                  <Button 
                    onClick={() => setShowModal(true)} 
                    className="gap-2 shadow-lg shadow-primary/20 transition-transform active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    Add Group
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search groups by name..."
                className="pl-10 h-11 bg-background/50 focus-visible:ring-primary/30 border-muted"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-11 px-4 gap-2 border-muted w-full sm:w-auto">
                    {sortOption === "newest" || sortOption === "oldest" ? (
                      sortOption === "newest" ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />
                    ) : (
                      <Calendar className="w-4 h-4" />
                    )}
                    <span className="capitalize">{sortOption}</span>
                    <ChevronDown className="w-4 h-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSortOption("newest")} className="gap-2">
                    <Clock className="w-4 h-4" /> Newest First
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOption("oldest")} className="gap-2">
                    <Calendar className="w-4 h-4" /> Oldest First
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOption("name")} className="gap-2">
                    <FolderOpen className="w-4 h-4" /> Name (A-Z)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOption("files")} className="gap-2">
                    <Music className="w-4 h-4" /> Most Files
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="hidden sm:flex border rounded-md p-1 bg-muted/30">
                <Button
                  variant={viewType === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewType("grid")}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewType === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewType("list")}
                >
                  <ListIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth custom-scrollbar">
        {sortedAndFilteredGroups.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-sm mx-auto">
              <div className="bg-muted/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <FolderOpen className="w-10 h-10 text-muted-foreground opacity-20" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {searchQuery ? "No matching groups" : "No groups found"}
              </h3>
              <p className="text-muted-foreground mb-8">
                {searchQuery 
                  ? "Try adjusting your search terms or filters." 
                  : canManageGroups 
                    ? "Get started by creating your first audio group to organize your files."
                    : "Wait for an administrator to assign groups to your account."}
              </p>
              {canManageGroups && (
                <Button onClick={() => setShowModal(true)} className="gap-2 rounded-full px-8">
                  <Plus className="w-4 h-4" />
                  Create First Group
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className={cn(
            "grid gap-6 transition-all duration-300",
            viewType === "grid" 
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
              : "grid-cols-1"
          )}>
            {sortedAndFilteredGroups.map((group) => {
              const annotated = getAnnotatedCount(group);
              const total = group.audioFiles.length;
              const progress = Math.round((annotated / total) * 100) || 0;
              const capacityPercent = Math.round((total / 100) * 100);

              return (
                <Card
                  key={group.id}
                  className={cn(
                    "group relative overflow-hidden transition-all duration-300 border-muted/50",
                    "hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/30 hover:-translate-y-1 cursor-pointer",
                    "bg-gradient-to-br from-card to-card/50",
                    viewType === "list" && "flex flex-row items-center p-4 gap-6"
                  )}
                  onClick={() =>
                    pathname === "/controls/groups"
                      ? router.push(`/controls/groups/${group.id}`)
                      : router.push(`/groups/${group.id}`)
                  }
                >
                  {/* Progress Line at top */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-muted/20">
                    <div 
                      className="h-full bg-primary transition-all duration-500" 
                      style={{ width: `${capacityPercent}%` }}
                    />
                  </div>

                  <div className={cn("p-5", viewType === "list" && "p-0 flex-1")}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                          <FileAudio className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg line-clamp-1">{group.name}</h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(group.dateAdded)}
                          </p>
                        </div>
                      </div>
                      
                      {canManageGroups && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete group "${group.name}"? This will remove all audio files.`)) {
                              handleDeleteGroup(group.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-muted/30 rounded-lg p-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Files</p>
                        <div className="flex items-end gap-1">
                          <span className="text-lg font-bold leading-none">{total}</span>
                          <span className="text-xs text-muted-foreground mb-0.5">/ 100</span>
                        </div>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Status</p>
                        <div className="flex items-center gap-1.5">
                          {annotated === total && total > 0 ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                              <span className="text-sm font-medium text-green-600">Done</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-4 h-4 text-amber-500" />
                              <span className="text-sm font-medium text-amber-600">
                                {progress}%
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Annotation progress</span>
                        <span className="font-bold text-primary">{annotated} / {total} files</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-1000",
                            progress === 100 ? "bg-green-500" : "bg-primary"
                          )}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Decorative element */}
                  <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in duration-200">
          <Card className="w-full max-w-2xl shadow-2xl border-primary/10">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold">Create New Group</h3>
                  <p className="text-muted-foreground text-sm">Upload up to 100 audio files to start a new project</p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleModalClose} className="rounded-full">
                  <Plus className="w-5 h-5 rotate-45" />
                </Button>
              </div>

              <div className="rounded-2xl overflow-hidden border-2 border-dashed border-primary/20 bg-primary/5">
                <Uploader
                  multiple={true}
                  accept={{ "audio/*": [] }}
                  onUploadComplete={(urls: string[]) => {
                    setUploadedUrls(urls);
                  }}
                  uploadTitle="Drop your audio recordings here"
                  maxSizeMB={50}
                  className="min-h-[240px]"
                />
              </div>

              {error && (
                <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm font-medium flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  {error}
                </div>
              )}

              {uploadedUrls.length > 0 && (
                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl animate-in slide-in-from-top-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-green-700 dark:text-green-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      {uploadedUrls.length} file{uploadedUrls.length !== 1 ? "s" : ""} ready to process
                    </p>
                    <span className="text-[10px] bg-green-500/20 px-2 py-0.5 rounded-full text-green-700 dark:text-green-400 uppercase font-bold">
                      Verified
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-8">
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-xl"
                  onClick={handleModalClose}
                  disabled={isCreating}
                >
                  Discard
                </Button>
                <Button
                  className="flex-1 h-12 rounded-xl shadow-lg shadow-primary/25"
                  onClick={handleCreateGroup}
                  disabled={uploadedUrls.length === 0 || isCreating}
                >
                  {isCreating
                    ? "Building Group..."
                    : `Initialize Group with ${uploadedUrls.length} Files`}
                </Button>
              </div>
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

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--muted);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--primary);
        }
      `}</style>
    </div>
  );
}
