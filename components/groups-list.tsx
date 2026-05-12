"use client"

import type React from "react"
import { useState, useMemo } from "react"
import type { AudioGroup, AudioFile } from "./audio-annotation-system"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  FolderOpen, 
  Music, 
  Trash2, 
  Plus, 
  Upload, 
  Calendar, 
  Clock, 
  CheckCircle2,
  FileAudio,
  Search,
  SortDesc,
  SortAsc
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface GroupsListProps {
  groups: AudioGroup[]
  onSelectGroup: (group: AudioGroup) => void
  onDeleteGroup: (groupId: string) => void
  onCreateGroup: (files: AudioFile[]) => void
}

export function GroupsList({ groups, onSelectGroup, onDeleteGroup, onCreateGroup }: GroupsListProps) {
  const [showModal, setShowModal] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getAnnotatedCount = (group: AudioGroup) => {
    return group.audioFiles.filter(
      (file) =>
        file.annotations &&
        (file.annotations.transcriptEnglish || file.annotations.transcriptKrio || file.annotations.category),
    ).length
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const audioFiles = files.filter((file) => file.type.startsWith("audio/"))

    if (audioFiles.length > 100) {
      setError(`Cannot add ${audioFiles.length} files. Maximum 100 files per group.`)
      return
    }

    setSelectedFiles(audioFiles)
    setError("")
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const audioFiles = files.filter((file) => file.type.startsWith("audio/"))

    if (audioFiles.length > 100) {
      setError(`Cannot add ${audioFiles.length} files. Maximum 100 files per group.`)
      return
    }

    setSelectedFiles(audioFiles)
    setError("")
  }

  const handleCreateGroup = async () => {
    if (selectedFiles.length === 0) return

    const audioFilesWithMetadata: AudioFile[] = await Promise.all(
      selectedFiles.map(async (file) => {
        const url = URL.createObjectURL(file)
        const audio = new Audio(url)

        return new Promise<AudioFile>((resolve) => {
          audio.addEventListener("loadedmetadata", () => {
            resolve({
              id: `audio-${Date.now()}-${Math.random()}`,
              file,
              url,
              name: file.name,
              duration: audio.duration,
            })
          })
        })
      }),
    )

    onCreateGroup(audioFilesWithMetadata)
    setSelectedFiles([])
    setShowModal(false)
  }

  const sortedAndFilteredGroups = useMemo(() => {
    const filtered = groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
    return [...filtered].sort((a, b) => {
      const timeA = new Date(a.dateAdded).getTime()
      const timeB = new Date(b.dateAdded).getTime()
      return sortOrder === "newest" ? timeB - timeA : timeA - timeB
    })
  }, [groups, searchQuery, sortOrder])

  return (
    <div className="h-full flex flex-col bg-background/50">
      <div className="p-6 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Audio Groups</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Manage and organize your audio collection
              </p>
            </div>
            <Button onClick={() => setShowModal(true)} className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" />
              Add Group
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search groups..."
                className="pl-9 h-10 bg-background/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={() => setSortOrder(prev => prev === "newest" ? "oldest" : "newest")}
              title={sortOrder === "newest" ? "Newest First" : "Oldest First"}
            >
              {sortOrder === "newest" ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar">
        {sortedAndFilteredGroups.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[300px]">
            <div className="text-center max-w-xs">
              <div className="bg-muted/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                <FolderOpen className="w-8 h-8 opacity-20" />
              </div>
              <h3 className="text-lg font-medium mb-1">No groups found</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {searchQuery ? "Try a different search term" : "Create your first group to get started"}
              </p>
              <Button onClick={() => setShowModal(true)} variant="outline" className="rounded-full px-6">
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedAndFilteredGroups.map((group) => {
              const annotated = getAnnotatedCount(group);
              const total = group.audioFiles.length;
              const progress = Math.round((annotated / total) * 100) || 0;

              return (
                <Card
                  key={group.id}
                  className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer border-muted/50 bg-card"
                  onClick={() => onSelectGroup(group)}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <FileAudio className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold line-clamp-1">{group.name}</h3>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-wider font-semibold">
                            <Calendar className="w-3 h-3" />
                            {formatDate(group.dateAdded)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(`Delete group "${group.name}"?`)) {
                            onDeleteGroup(group.id)
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-4 mb-5">
                      <div className="flex-1">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Files</p>
                        <p className="text-sm font-semibold">{total} / 100</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Status</p>
                        <div className="flex items-center gap-1">
                          {progress === 100 ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-500" />
                          )}
                          <span className={cn("text-sm font-semibold", progress === 100 ? "text-green-600" : "text-amber-600")}>
                            {progress}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full transition-all duration-500", progress === 100 ? "bg-green-500" : "bg-primary")}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-0 left-0 w-full h-1 bg-primary/20">
                    <div className="h-full bg-primary" style={{ width: `${(total/100)*100}%` }} />
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl shadow-2xl">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Create New Group</h3>

              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer",
                  isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/40"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-primary opacity-50" />
                <p className="text-sm font-medium mb-1">Drag and drop audio files here</p>
                <p className="text-xs text-muted-foreground mb-6">or click to browse from your computer</p>
                
                <label className="cursor-pointer">
                  <input type="file" multiple accept="audio/*" className="hidden" onChange={handleFileSelect} />
                  <Button variant="secondary" size="sm" asChild>
                    <span>Select Files</span>
                  </Button>
                </label>
                <p className="text-[10px] text-muted-foreground mt-6 uppercase tracking-widest font-bold">Max 100 files</p>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs font-medium">
                  {error}
                </div>
              )}

              {selectedFiles.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold">Selected Files ({selectedFiles.length})</h4>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedFiles([])} className="h-7 text-xs text-muted-foreground">Clear all</Button>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="text-xs p-2 bg-muted/30 rounded flex items-center gap-2">
                        <Music className="w-3.5 h-3.5 text-primary" />
                        <span className="flex-1 truncate">{file.name}</span>
                        <span className="text-muted-foreground font-mono">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-8">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    setShowModal(false)
                    setSelectedFiles([])
                    setError("")
                  }}
                >
                  Cancel
                </Button>
                <Button className="flex-1 shadow-lg shadow-primary/20" onClick={handleCreateGroup} disabled={selectedFiles.length === 0}>
                  Create Group ({selectedFiles.length})
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
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
  )
}
