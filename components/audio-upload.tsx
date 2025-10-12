"use client"

import type React from "react"
import { useCallback, useState } from "react"
import { Upload } from "lucide-react"
import type { AudioFile } from "./audio-annotation-system"

interface AudioUploadProps {
  onFilesUploaded: (files: AudioFile[]) => void
  maxFiles?: number
  currentCount?: number
}

export function AudioUpload({ onFilesUploaded, maxFiles = 100, currentCount = 0 }: AudioUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)
  const [error, setError] = useState<string>("")

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  }, [])

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return

    if (files.length + currentCount > maxFiles) {
      setError(`Cannot add ${files.length} files. Maximum ${maxFiles} files per group (currently ${currentCount})`)
      return
    }

    setError("")
    setIsProcessing(true)

    const processedFiles: AudioFile[] = await Promise.all(
      files.map(async (file) => {
        const url = URL.createObjectURL(file)

        // Get audio duration
        const duration = await new Promise<number>((resolve) => {
          const audio = new Audio(url)
          audio.addEventListener("loadedmetadata", () => {
            resolve(audio.duration)
          })
        })

        return {
          id: crypto.randomUUID(),
          file,
          url,
          name: file.name,
          duration,
        }
      }),
    )

    onFilesUploaded(processedFiles)
    setIsProcessing(false)
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragActive(false)

      const files = Array.from(e.dataTransfer.files)
      const audioFiles = files.filter((file) => file.type.startsWith("audio/"))

      if (audioFiles.length > 0) {
        processFiles(audioFiles)
      }
    },
    [currentCount, maxFiles],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      const audioFiles = files.filter((file) => file.type.startsWith("audio/"))

      if (audioFiles.length > 0) {
        processFiles(audioFiles)
      }

      e.target.value = ""
    },
    [currentCount, maxFiles],
  )

  const remainingSlots = maxFiles - currentCount

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-md cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : remainingSlots === 0
              ? "border-muted-foreground/10 bg-muted/50 cursor-not-allowed"
              : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onClick={() => {
          if (remainingSlots > 0) {
            document.getElementById("audio-file-input")?.click()
          }
        }}
      >
        <input
          id="audio-file-input"
          type="file"
          multiple
          accept="audio/*"
          onChange={handleFileInput}
          className="hidden"
          disabled={remainingSlots === 0}
        />
        <Upload className="h-4 w-4" />
        <span className="text-sm">
          {isProcessing
            ? "Processing..."
            : isDragActive
              ? "Drop files here"
              : remainingSlots === 0
                ? "Group Full"
                : "Upload Audio"}
        </span>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive rounded-md p-2">
          {error}
        </div>
      )}

      {isProcessing && <div className="text-sm text-muted-foreground">Processing audio files...</div>}

      {remainingSlots > 0 && (
        <div className="text-xs text-muted-foreground">
          {remainingSlots} of {maxFiles} slots available
        </div>
      )}
    </div>
  )
}
