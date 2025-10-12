"use client"

import type React from "react"

import type { AudioGroup, AudioFile } from "./audio-annotation-system"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FolderOpen, Music, Trash2, Plus, Upload } from "lucide-react"
import { useState } from "react"

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

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Audio Groups</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Organize your audio files into groups of up to 100 files each
            </p>
          </div>
          <Button onClick={() => setShowModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Group
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {groups.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No groups yet</h3>
              <p className="text-sm mb-4">Create a group and upload audio files to get started</p>
              <Button onClick={() => setShowModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Group
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <Card
                key={group.id}
                className="p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary/50 group"
                onClick={() => onSelectGroup(group)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">{group.name}</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`Delete group "${group.name}"? This will remove all audio files in this group.`)) {
                        onDeleteGroup(group.id)
                      }
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Music className="w-4 h-4" />
                    <span>{group.audioFiles.length} / 100 audio files</span>
                  </div>

                  <div className="text-muted-foreground">Added: {formatDate(group.dateAdded)}</div>

                  {getAnnotatedCount(group) > 0 && (
                    <div className="text-green-600 text-xs">✓ {getAnnotatedCount(group)} annotated</div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t">
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${(group.audioFiles.length / 100) * 100}%` }}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl p-6 m-4">
            <h3 className="text-lg font-semibold mb-4">Create New Group</h3>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">Drag and drop audio files here, or</p>
              <label className="cursor-pointer">
                <input type="file" multiple accept="audio/*" className="hidden" onChange={handleFileSelect} />
                <Button variant="outline" size="sm" asChild>
                  <span>Browse Files</span>
                </Button>
              </label>
              <p className="text-xs text-muted-foreground mt-4">Maximum 100 audio files per group</p>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive rounded-lg text-destructive text-sm">
                {error}
              </div>
            )}

            {selectedFiles.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Selected Files ({selectedFiles.length})</h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                      <Music className="w-4 h-4" />
                      {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
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
                  setShowModal(false)
                  setSelectedFiles([])
                  setError("")
                }}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleCreateGroup} disabled={selectedFiles.length === 0}>
                Create Group with {selectedFiles.length} Files
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
