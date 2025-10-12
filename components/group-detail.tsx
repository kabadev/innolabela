"use client"

import type React from "react"
import type { AudioGroup, AudioFileWithSegments, AudioFile } from "./audio-annotation-system"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Music, Trash2, Upload, CheckCircle2 } from "lucide-react"
import { useState } from "react"
import { SimpleAudioPlayer } from "./simple-audio-player"

interface GroupDetailProps {
  group: AudioGroup
  onSelectAudio: (audio: AudioFileWithSegments) => void
  onDeleteAudio: (audioId: string) => void
  onBack: () => void
  onAddFiles: (files: AudioFile[], groupId: string) => void
  onSaveAnnotations: (annotations: any) => void
}

export function GroupDetail({
  group,
  onSelectAudio,
  onDeleteAudio,
  onBack,
  onAddFiles,
  onSaveAnnotations,
}: GroupDetailProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [error, setError] = useState<string>("")
  const [selectedAudio, setSelectedAudio] = useState<AudioFileWithSegments | null>(null)

  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60)
    const seconds = Math.floor(duration % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const getAnnotatedCount = () => {
    return group.audioFiles.filter(
      (file) =>
        file.annotations &&
        (file.annotations.transcriptEnglish || file.annotations.transcriptKrio || file.annotations.category),
    ).length
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const audioFiles = files.filter((file) => file.type.startsWith("audio/"))

    if (audioFiles.length + group.audioFiles.length > 100) {
      setError(`Cannot add ${audioFiles.length} files. Group limit is 100 files (currently ${group.audioFiles.length})`)
      return
    }

    setSelectedFiles(audioFiles)
    setError("")
  }

  const handleAddFiles = async () => {
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

    onAddFiles(audioFilesWithMetadata, group.id)
    setSelectedFiles([])
    setShowUploadModal(false)
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

    if (audioFiles.length + group.audioFiles.length > 100) {
      setError(`Cannot add ${audioFiles.length} files. Group limit is 100 files (currently ${group.audioFiles.length})`)
      return
    }

    setSelectedFiles(audioFiles)
    setShowUploadModal(true)
    setError("")
  }

  const handleAudioClick = (audio: AudioFileWithSegments) => {
    setSelectedAudio(audio)
    onSelectAudio(audio)
  }

  const isAnnotated = (file: AudioFileWithSegments) => {
    return (
      file.annotations &&
      (file.annotations.transcriptEnglish || file.annotations.transcriptKrio || file.annotations.category)
    )
  }

  return (
    <div className="h-full flex">
      {/* Left Sidebar - Audio List */}
      <div className="w-80 border-r flex flex-col bg-muted/30">
        <div className="p-4 border-b bg-background">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Audio Files</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowUploadModal(true)}
              disabled={group.audioFiles.length >= 100}
            >
              <Upload className="w-3 h-3 mr-1" />
              Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {group.audioFiles.length} / 100 files • {getAnnotatedCount()} annotated
          </p>
          <div className="w-full bg-muted rounded-full h-1.5 mt-2">
            <div
              className="bg-primary rounded-full h-1.5 transition-all"
              style={{ width: `${(group.audioFiles.length / 100) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {group.audioFiles.length === 0 ? (
            <div className="flex items-center justify-center h-full p-4">
              <div className="text-center text-muted-foreground">
                <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm mb-3">No audio files</p>
                <Button size="sm" onClick={() => setShowUploadModal(true)}>
                  <Upload className="w-3 h-3 mr-1" />
                  Add Files
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {group.audioFiles.map((file) => (
                <div
                  key={file.id}
                  className={`p-3 rounded-lg cursor-pointer transition-all group hover:bg-background ${
                    selectedAudio?.id === file.id ? "bg-background shadow-sm border border-primary/50" : ""
                  }`}
                  onClick={() => handleAudioClick(file)}
                >
                  <div className="flex items-start gap-2">
                    <Music className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatDuration(file.duration)}</p>
                      {isAnnotated(file) && (
                        <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Annotated
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`Delete "${file.name}"?`)) {
                          onDeleteAudio(file.id)
                          if (selectedAudio?.id === file.id) {
                            setSelectedAudio(null)
                          }
                        }
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Audio Player */}
      <div className="flex-1 flex flex-col">
        {selectedAudio ? (
          <SimpleAudioPlayer audioFile={selectedAudio} onSave={onSaveAnnotations} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Music className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No audio selected</h3>
              <p className="text-sm">Select an audio file from the sidebar to start annotating</p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl p-6 m-4">
            <h3 className="text-lg font-semibold mb-4">Add Audio Files to {group.name}</h3>

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
              <p className="text-xs text-muted-foreground mt-4">
                Current: {group.audioFiles.length} / 100 files • Can add up to {100 - group.audioFiles.length} more
              </p>
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
                  setShowUploadModal(false)
                  setSelectedFiles([])
                  setError("")
                }}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleAddFiles} disabled={selectedFiles.length === 0}>
                Add {selectedFiles.length} Files
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
