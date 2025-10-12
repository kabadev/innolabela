"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, SkipBack, SkipForward, Scissors, RotateCcw } from "lucide-react"
import type { AudioFileWithSegments, AudioSegment } from "./audio-annotation-system"

interface LabelStudioInterfaceProps {
  audioFile: AudioFileWithSegments
  segments: AudioSegment[]
  onSegmentsChange: (segments: AudioSegment[]) => void
}

export function LabelStudioInterface({ audioFile, segments, onSegmentsChange }: LabelStudioInterfaceProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [selectedSegment, setSelectedSegment] = useState<AudioSegment | null>(null)
  const [segmentMode, setSegmentMode] = useState<"none" | "marking">("none")
  const [pendingStart, setPendingStart] = useState<number | null>(null)
  const [isLooping, setIsLooping] = useState(false)
  const [waveformData, setWaveformData] = useState<number[]>([])

  const audioRef = useRef<HTMLAudioElement>(null)
  const waveformRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const generateWaveform = async () => {
      try {
        const response = await fetch(audioFile.url)
        const arrayBuffer = await response.arrayBuffer()
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

        const channelData = audioBuffer.getChannelData(0)
        const samples = 800 // Number of samples for waveform
        const blockSize = Math.floor(channelData.length / samples)
        const waveform: number[] = []

        for (let i = 0; i < samples; i++) {
          let sum = 0
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[i * blockSize + j] || 0)
          }
          waveform.push(sum / blockSize)
        }

        setWaveformData(waveform)
        console.log("[v0] Generated waveform with", waveform.length, "samples")
      } catch (error) {
        console.error("[v0] Error generating waveform:", error)
        // Fallback to random waveform for demo
        const fallbackWaveform = Array.from({ length: 800 }, () => Math.random() * 0.5)
        setWaveformData(fallbackWaveform)
      }
    }

    generateWaveform()
  }, [audioFile.url])

  useEffect(() => {
    const drawWaveform = () => {
      const canvas = waveformRef.current
      if (!canvas || waveformData.length === 0) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)

      // Draw waveform
      ctx.fillStyle = "#e5e7eb"
      ctx.strokeStyle = "#6b7280"
      ctx.lineWidth = 1

      const barWidth = width / waveformData.length
      const centerY = height / 2

      waveformData.forEach((amplitude, i) => {
        const barHeight = amplitude * height * 0.8
        const x = i * barWidth

        ctx.fillRect(x, centerY - barHeight / 2, barWidth - 0.5, barHeight)
      })

      // Draw segments
      segments.forEach((segment) => {
        const startX = (segment.start / duration) * width
        const endX = (segment.end / duration) * width
        const segmentWidth = endX - startX

        // Segment background
        ctx.fillStyle =
          selectedSegment?.id === segment.id
            ? "rgba(34, 197, 94, 0.2)" // Green for selected/looping
            : "rgba(59, 130, 246, 0.15)" // Blue for other segments
        ctx.fillRect(startX, 0, segmentWidth, height)

        // Segment borders
        ctx.strokeStyle =
          selectedSegment?.id === segment.id
            ? "#22c55e" // Green border for selected
            : "#3b82f6" // Blue border for others
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(startX, 0)
        ctx.lineTo(startX, height)
        ctx.moveTo(endX, 0)
        ctx.lineTo(endX, height)
        ctx.stroke()
      })

      // Draw pending segment
      if (segmentMode === "marking" && pendingStart !== null) {
        const startX = (pendingStart / duration) * width
        const currentX = (currentTime / duration) * width
        const segmentWidth = Math.abs(currentX - startX)
        const leftX = Math.min(startX, currentX)

        ctx.fillStyle = "rgba(251, 191, 36, 0.3)" // Yellow for pending
        ctx.fillRect(leftX, 0, segmentWidth, height)

        ctx.strokeStyle = "#f59e0b"
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(leftX, 0)
        ctx.lineTo(leftX, height)
        ctx.moveTo(leftX + segmentWidth, 0)
        ctx.lineTo(leftX + segmentWidth, height)
        ctx.stroke()
        ctx.setLineDash([])
      }

      // Draw playhead
      if (duration > 0) {
        const playheadX = (currentTime / duration) * width
        ctx.strokeStyle = "#ef4444" // Red playhead
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(playheadX, 0)
        ctx.lineTo(playheadX, height)
        ctx.stroke()

        // Playhead circle
        ctx.fillStyle = "#ef4444"
        ctx.beginPath()
        ctx.arc(playheadX, 10, 4, 0, 2 * Math.PI)
        ctx.fill()
      }
    }

    drawWaveform()
  }, [waveformData, segments, selectedSegment, currentTime, duration, segmentMode, pendingStart])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)

      if (isLooping && selectedSegment && isPlaying) {
        if (audio.currentTime >= selectedSegment.end) {
          audio.currentTime = selectedSegment.start
        }
      }
    }

    const handleLoadedMetadata = () => setDuration(audio.duration)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
    }
  }, [audioFile, isLooping, selectedSegment, isPlaying])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case " ":
          e.preventDefault()
          togglePlayPause()
          break
        case "ArrowLeft":
          e.preventDefault()
          seekRelative(-1)
          break
        case "ArrowRight":
          e.preventDefault()
          seekRelative(1)
          break
        case "s":
          e.preventDefault()
          startSegmentMarking()
          break
        case "Enter":
          if (segmentMode === "marking" && pendingStart !== null) {
            e.preventDefault()
            finishSegmentMarking()
          }
          break
        case "Escape":
          e.preventDefault()
          cancelSegmentMarking()
          break
        case "l":
          e.preventDefault()
          toggleLoop()
          break
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [segmentMode, pendingStart, selectedSegment])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
  }

  const seekRelative = (seconds: number) => {
    const audio = audioRef.current
    if (!audio) return

    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds))
  }

  const seekToTime = (time: number) => {
    const audio = audioRef.current
    if (!audio) return

    audio.currentTime = Math.max(0, Math.min(duration, time))
  }

  const startSegmentMarking = () => {
    console.log("[v0] Starting segment marking at time:", currentTime)
    setSegmentMode("marking")
    setPendingStart(currentTime)
    setSelectedSegment(null)
  }

  const finishSegmentMarking = () => {
    if (pendingStart === null) return

    const start = Math.min(pendingStart, currentTime)
    const end = Math.max(pendingStart, currentTime)

    console.log("[v0] Finishing segment marking:", { start, end, duration: end - start })

    if (end - start > 0.1) {
      const newSegment: AudioSegment = {
        id: Date.now().toString(),
        start,
        end,
        speaker: "",
        transcriptKrio: "",
        transcriptEnglish: "",
      }
      const updatedSegments = [...segments, newSegment].sort((a, b) => a.start - b.start)
      console.log("[v0] Created new segment, total segments:", updatedSegments.length)
      onSegmentsChange(updatedSegments)
      setSelectedSegment(newSegment)
    } else {
      console.log("[v0] Segment too short, not creating")
    }

    setSegmentMode("none")
    setPendingStart(null)
  }

  const cancelSegmentMarking = () => {
    setSegmentMode("none")
    setPendingStart(null)
  }

  const handleWaveformClick = (e: React.MouseEvent) => {
    const canvas = waveformRef.current
    if (!canvas || duration === 0) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const clickTime = (x / canvas.width) * duration

    if (segmentMode === "marking") {
      finishSegmentMarking()
    } else {
      const clickedSegment = segments.find((segment) => clickTime >= segment.start && clickTime <= segment.end)

      if (clickedSegment) {
        setSelectedSegment(clickedSegment)
        setIsLooping(true)
      } else {
        setSelectedSegment(null)
        setIsLooping(false)
      }

      seekToTime(clickTime)
    }
  }

  const updateSelectedSegment = (updates: Partial<AudioSegment>) => {
    if (!selectedSegment) return

    const updatedSegment = { ...selectedSegment, ...updates }
    const updatedSegments = segments.map((seg) => (seg.id === selectedSegment.id ? updatedSegment : seg))
    onSegmentsChange(updatedSegments)
    setSelectedSegment(updatedSegment)
  }

  const deleteSelectedSegment = () => {
    if (!selectedSegment) return

    const updatedSegments = segments.filter((seg) => seg.id !== selectedSegment.id)
    onSegmentsChange(updatedSegments)
    setSelectedSegment(null)
  }

  const toggleLoop = () => {
    if (selectedSegment) {
      setIsLooping(!isLooping)
      console.log("[v0] Toggled loop for segment:", selectedSegment.id, "Loop:", !isLooping)
    }
  }

  const playSegment = (segment: AudioSegment) => {
    const audio = audioRef.current
    if (!audio) return

    audio.currentTime = segment.start
    setSelectedSegment(segment)
    setIsLooping(true)
    audio.play()
    console.log("[v0] Playing segment with loop:", segment.id)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    const milliseconds = Math.floor((time % 1) * 100)
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`
  }

  return (
    <div className="h-full flex flex-col">
      <audio ref={audioRef} src={audioFile.url} />

      <div className="flex-1 p-4">
        <div ref={containerRef} className="h-full">
          <div className="relative">
            <canvas
              ref={waveformRef}
              width={800}
              height={200}
              className={`w-full h-48 border rounded-md bg-gray-50 ${
                segmentMode === "marking" ? "cursor-crosshair" : "cursor-pointer"
              }`}
              onClick={handleWaveformClick}
            />
            {waveformData.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 border rounded-md">
                <span className="text-gray-500">Loading waveform...</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mt-4">
            <Button variant="outline" size="sm" onClick={() => seekRelative(-5)}>
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button onClick={togglePlayPause}>
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => seekRelative(5)}>
              <SkipForward className="w-4 h-4" />
            </Button>
            {selectedSegment && (
              <Button
                variant={isLooping ? "default" : "outline"}
                size="sm"
                onClick={toggleLoop}
                className={isLooping ? "bg-green-600 hover:bg-green-700" : ""}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Loop (L)
              </Button>
            )}
            <div className="border-l pl-4 ml-4">
              {segmentMode === "none" ? (
                <Button variant="outline" size="sm" onClick={startSegmentMarking}>
                  <Scissors className="w-4 h-4 mr-2" />
                  Mark Segment (S)
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Badge variant="secondary">Marking segment from {formatTime(pendingStart || 0)}</Badge>
                  <Button size="sm" onClick={finishSegmentMarking}>
                    Finish (Enter)
                  </Button>
                  <Button variant="outline" size="sm" onClick={cancelSegmentMarking}>
                    Cancel (Esc)
                  </Button>
                </div>
              )}
            </div>
            <span className="text-sm text-muted-foreground ml-auto">
              {formatTime(currentTime)} / {formatTime(duration)}
              {isLooping && selectedSegment && (
                <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
                  Looping
                </Badge>
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t bg-muted/30 p-4 h-80 overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-3">Segments ({segments.length})</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {segments.map((segment) => (
                <Card
                  key={segment.id}
                  className={`p-3 cursor-pointer transition-colors ${
                    selectedSegment?.id === segment.id ? "bg-primary/10 border-primary" : ""
                  }`}
                  onClick={() => setSelectedSegment(segment)}
                >
                  <div className="text-sm">
                    <div className="font-medium flex items-center justify-between">
                      <span>
                        {formatTime(segment.start)} - {formatTime(segment.end)}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          playSegment(segment)
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="text-muted-foreground truncate">
                      {segment.speaker || "No speaker"} • {segment.transcriptEnglish || "No transcript"}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-3">{selectedSegment ? "Edit Segment" : "Select a segment to edit"}</h3>
            {selectedSegment && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="speaker">Speaker</Label>
                  <Input
                    id="speaker"
                    value={selectedSegment.speaker}
                    onChange={(e) => updateSelectedSegment({ speaker: e.target.value })}
                    placeholder="Speaker name"
                  />
                </div>
                <div>
                  <Label htmlFor="krio">Transcript (Krio)</Label>
                  <Textarea
                    id="krio"
                    value={selectedSegment.transcriptKrio}
                    onChange={(e) => updateSelectedSegment({ transcriptKrio: e.target.value })}
                    placeholder="Krio transcript"
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="english">Transcript (English)</Label>
                  <Textarea
                    id="english"
                    value={selectedSegment.transcriptEnglish}
                    onChange={(e) => updateSelectedSegment({ transcriptEnglish: e.target.value })}
                    placeholder="English transcript"
                    rows={2}
                  />
                </div>
                <Button variant="destructive" size="sm" onClick={deleteSelectedSegment}>
                  Delete Segment
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t bg-background p-2 text-xs text-muted-foreground">
        <div className="flex gap-4">
          <span>• S: Start marking segment</span>
          <span>• Enter: Finish segment</span>
          <span>• Space: Play/Pause</span>
          <span>• ←/→: Seek 1s</span>
          <span>• L: Toggle loop</span>
          <span>• Click segments to edit</span>
          {segmentMode === "marking" && (
            <span className="text-orange-600 font-medium">• Currently marking segment - press Enter to finish</span>
          )}
          {isLooping && selectedSegment && (
            <span className="text-green-600 font-medium">• Looping selected segment</span>
          )}
        </div>
      </div>
    </div>
  )
}
