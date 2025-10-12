"use client"

import { useState } from "react"
import type { AudioFile } from "./audio-annotation-system"
import { AudioPlayer } from "./audio-player"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Trash2, Edit, Save, X } from "lucide-react"

interface AudioTableProps {
  audioFiles: AudioFile[]
  onUpdateAudio: (id: string, updates: Partial<AudioFile>) => void
  onDeleteAudio: (id: string) => void
}

export function AudioTable({ audioFiles, onUpdateAudio, onDeleteAudio }: AudioTableProps) {
  const [editingRows, setEditingRows] = useState<Set<string>>(new Set())
  const [tempValues, setTempValues] = useState<Record<string, Partial<AudioFile>>>({})

  const startEditing = (audioFile: AudioFile) => {
    setEditingRows((prev) => new Set(prev).add(audioFile.id))
    setTempValues((prev) => ({
      ...prev,
      [audioFile.id]: {
        speaker: audioFile.speaker,
        transcriptKrio: audioFile.transcriptKrio,
        transcriptEnglish: audioFile.transcriptEnglish,
      },
    }))
  }

  const saveChanges = (id: string) => {
    const changes = tempValues[id]
    if (changes) {
      onUpdateAudio(id, changes)
    }
    setEditingRows((prev) => {
      const newSet = new Set(prev)
      newSet.delete(id)
      return newSet
    })
    setTempValues((prev) => {
      const newValues = { ...prev }
      delete newValues[id]
      return newValues
    })
  }

  const cancelEditing = (id: string) => {
    setEditingRows((prev) => {
      const newSet = new Set(prev)
      newSet.delete(id)
      return newSet
    })
    setTempValues((prev) => {
      const newValues = { ...prev }
      delete newValues[id]
      return newValues
    })
  }

  const updateTempValue = (id: string, field: keyof AudioFile, value: string) => {
    setTempValues((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }))
  }

  if (audioFiles.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            No audio files uploaded yet. Upload some files to start annotating.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audio Annotation Editor</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Audio</TableHead>
                <TableHead className="w-[150px]">Speaker</TableHead>
                <TableHead className="w-[250px]">Transcript (Krio)</TableHead>
                <TableHead className="w-[250px]">Transcript (English)</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audioFiles.map((audioFile) => {
                const isEditing = editingRows.has(audioFile.id)
                const tempData = tempValues[audioFile.id] || {}

                return (
                  <TableRow key={audioFile.id} className={isEditing ? "bg-muted/50" : ""}>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="text-sm font-medium truncate" title={audioFile.file.name}>
                          {audioFile.file.name}
                        </div>
                        <div className="text-xs text-muted-foreground">{audioFile.duration.toFixed(1)}s</div>
                        <AudioPlayer audioUrl={audioFile.url} />
                      </div>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          placeholder="Speaker name"
                          value={tempData.speaker || ""}
                          onChange={(e) => updateTempValue(audioFile.id, "speaker", e.target.value)}
                        />
                      ) : (
                        <div className="py-2 px-3 min-h-[40px] flex items-center">
                          {audioFile.speaker || <span className="text-muted-foreground">No speaker</span>}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Textarea
                          placeholder="Krio transcript..."
                          value={tempData.transcriptKrio || ""}
                          onChange={(e) => updateTempValue(audioFile.id, "transcriptKrio", e.target.value)}
                          rows={3}
                        />
                      ) : (
                        <div className="py-2 px-3 min-h-[76px] flex items-start">
                          {audioFile.transcriptKrio || <span className="text-muted-foreground">No transcript</span>}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Textarea
                          placeholder="English transcript..."
                          value={tempData.transcriptEnglish || ""}
                          onChange={(e) => updateTempValue(audioFile.id, "transcriptEnglish", e.target.value)}
                          rows={3}
                        />
                      ) : (
                        <div className="py-2 px-3 min-h-[76px] flex items-start">
                          {audioFile.transcriptEnglish || <span className="text-muted-foreground">No transcript</span>}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {isEditing ? (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => saveChanges(audioFile.id)}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => cancelEditing(audioFile.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => startEditing(audioFile)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => onDeleteAudio(audioFile.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
