"use client";

import { useState, useEffect, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Calendar,
  Play,
  Pause,
  Eye,
  Archive,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import JSZip from "jszip";
import { AudioFileWithGroup, getAudioFiles } from "@/app/actions";
import { toast } from "sonner";

export function AudioFilesTable({ userId }: { userId?: string }) {
  const [audioFiles, setAudioFiles] = useState<AudioFileWithGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [completedFilter, setCompletedFilter] = useState<
    "all" | "completed" | "incomplete"
  >("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [downloadingType, setDownloadingType] = useState<string | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  const fetchAudioFiles = async () => {
    setLoading(true);
    try {
      const result = await getAudioFiles({
        page,
        limit: itemsPerPage,
        search,
        completedFilter,
        selectedDate,
      });
      setAudioFiles(result.audioFiles);
      setTotalPages(result.pagination.totalPages);
    } catch (error) {
      console.error("[v0] Error loading audio files:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudioFiles();
  }, [page, search, completedFilter, selectedDate, itemsPerPage]);

  const togglePlay = (fileId: string, url: string) => {
    Object.keys(audioRefs.current).forEach((id) => {
      if (id !== fileId && audioRefs.current[id]) {
        audioRefs.current[id].pause();
      }
    });

    const audio = audioRefs.current[fileId];
    if (audio) {
      if (playingId === fileId) {
        audio.pause();
        setPlayingId(null);
      } else {
        audio.play();
        setPlayingId(fileId);
      }
    } else {
      const newAudio = new Audio(url);
      audioRefs.current[fileId] = newAudio;
      newAudio.play();
      setPlayingId(fileId);

      newAudio.addEventListener("ended", () => {
        setPlayingId(null);
      });
    }
  };

  const isFileCompleted = (file: any) =>
    file.annotations?.status === "completed" ||
    file.annotations?.status === "verified" ||
    (Boolean(file.annotations?.transcriptKrio) &&
      Boolean(file.annotations?.transcriptEnglish));

  const fetchAllCompletedAudioFilesFromDB = async () => {
    const result = await getAudioFiles({
      page: 1,
      limit: 10000,
      search: "",
      completedFilter: "all",
      selectedDate: "",
    });
    return (result.audioFiles || []).filter(isFileCompleted);
  };

  const exportToJSON = async () => {
    setDownloadingType("json");
    try {
      const completedFiles = await fetchAllCompletedAudioFilesFromDB();
      if (completedFiles.length === 0) {
        toast.error("No completed audio files found in database.");
        return;
      }
      const exportData = completedFiles.map((file: any) => ({
        id: file.id || (file as any)._id,
        name: file.name,
        url: file.url,
        duration: file.duration,
        groupId: file.groupId,
        groupName: file.groupName,
        category: file.annotations?.category || "",
        status: file.annotations?.status || "completed",
        transcriptKrio: file.annotations?.transcriptKrio || "",
        transcriptEnglish: file.annotations?.transcriptEnglish || "",
        speakerTags: file.annotations?.speakerTags || [],
        annotations: file.annotations || {},
      }));

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `all-completed-audio-files-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(
        `Exported ${completedFiles.length} completed audio file(s) from database to JSON.`,
      );
    } catch (err) {
      console.error("Export JSON error:", err);
      toast.error("Failed to export JSON.");
    } finally {
      setDownloadingType(null);
    }
  };

  const exportToCSV = async () => {
    setDownloadingType("csv");
    try {
      const completedFiles = await fetchAllCompletedAudioFilesFromDB();
      if (completedFiles.length === 0) {
        toast.error("No completed audio files found in database.");
        return;
      }
      const headers = [
        "ID",
        "Name",
        "Audio URL",
        "Duration",
        "Group ID",
        "Group Name",
        "Category",
        "Status",
        "Krio Transcript",
        "English Transcript",
        "Speaker Tags",
      ];

      const rows = completedFiles.map((file: any) => [
        `"${file.id || (file as any)._id || ""}"`,
        `"${(file.name || "").replace(/"/g, '""')}"`,
        `"${(file.url || "").replace(/"/g, '""')}"`,
        file.duration || 0,
        `"${file.groupId || ""}"`,
        `"${(file.groupName || "").replace(/"/g, '""')}"`,
        `"${(file.annotations?.category || "").replace(/"/g, '""')}"`,
        `"${(file.annotations?.status || "completed").replace(/"/g, '""')}"`,
        `"${(file.annotations?.transcriptKrio || "").replace(/"/g, '""')}"`,
        `"${(file.annotations?.transcriptEnglish || "").replace(/"/g, '""')}"`,
        `"${(file.annotations?.speakerTags?.map((s: any) => `[${s.time}s: ${s.label}]`).join("; ") || "").replace(/"/g, '""')}"`,
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row: any) => row.join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `all-completed-audio-files-${new Date().toISOString()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(
        `Exported ${completedFiles.length} completed audio file(s) from database to CSV.`,
      );
    } catch (err) {
      console.error("Export CSV error:", err);
      toast.error("Failed to export CSV.");
    } finally {
      setDownloadingType(null);
    }
  };

  const downloadZip = async () => {
    setDownloadingType("zip");
    const toastId = toast.loading(
      "Preparing ZIP archive of all completed audio files in database...",
    );
    try {
      const allFiles = await fetchAllCompletedAudioFilesFromDB();
      if (allFiles.length === 0) {
        toast.error("No completed audio files found in database.", {
          id: toastId,
        });
        return;
      }

      const zip = new JSZip();
      const audioFolder = zip.folder("audio");
      const exportData: Array<any> = [];

      for (let i = 0; i < allFiles.length; i++) {
        const file = allFiles[i];

        try {
          const response = await fetch(file.url);
          const audioBlob = await response.blob();

          const urlParts = file.url.split("/");
          const originalFilename = urlParts[urlParts.length - 1];
          const extension = originalFilename.includes(".")
            ? originalFilename.split(".").pop()
            : "wav";
          const filename = `${file.name || `audio_${i + 1}`}.${extension}`;

          audioFolder?.file(filename, audioBlob);

          exportData.push({
            id: file.id || (file as any)._id,
            name: file.name,
            originalUrl: file.url,
            localPath: `/audio/${filename}`,
            duration: file.duration,
            groupId: file.groupId,
            groupName: file.groupName,
            category: file.annotations?.category || "",
            status: file.annotations?.status || "completed",
            transcriptKrio: file.annotations?.transcriptKrio || "",
            transcriptEnglish: file.annotations?.transcriptEnglish || "",
            speakerTags: file.annotations?.speakerTags || [],
            annotations: file.annotations || {},
          });
        } catch (error) {
          console.error(`Error downloading audio file ${file.name}:`, error);
        }
      }

      const jsonContent = JSON.stringify(exportData, null, 2);
      zip.file("data.json", jsonContent);

      const headers = [
        "ID",
        "Name",
        "Original URL",
        "Local Path",
        "Duration",
        "Group ID",
        "Group Name",
        "Category",
        "Status",
        "Krio Transcript",
        "English Transcript",
        "Speaker Tags",
      ];
      const csvRows = exportData.map((row) => [
        `"${row.id || ""}"`,
        `"${(row.name || "").replace(/"/g, '""')}"`,
        `"${(row.originalUrl || "").replace(/"/g, '""')}"`,
        `"${(row.localPath || "").replace(/"/g, '""')}"`,
        row.duration || 0,
        `"${row.groupId || ""}"`,
        `"${(row.groupName || "").replace(/"/g, '""')}"`,
        `"${(row.category || "").replace(/"/g, '""')}"`,
        `"${(row.status || "completed").replace(/"/g, '""')}"`,
        `"${(row.transcriptKrio || "").replace(/"/g, '""')}"`,
        `"${(row.transcriptEnglish || "").replace(/"/g, '""')}"`,
        `"${(row.speakerTags?.map((s: any) => `[${s.time}s: ${s.label}]`).join("; ") || "").replace(/"/g, '""')}"`,
      ]);

      const csvContent = [
        headers.join(","),
        ...csvRows.map((r) => r.join(",")),
      ].join("\n");
      zip.file("data.csv", csvContent);

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `all-completed-audio-dataset-${new Date().toISOString()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(
        `Exported ZIP containing ${allFiles.length} completed audio file(s) from database.`,
        { id: toastId },
      );
    } catch (error) {
      console.error("Error creating zip file:", error);
      toast.error("Error creating ZIP file. Please try again.", {
        id: toastId,
      });
    } finally {
      setDownloadingType(null);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Audio Files</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search audio files..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap items-center gap-4">
            <Select
              value={completedFilter}
              onValueChange={(value: any) => {
                setCompletedFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Files</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="incomplete">Incomplete</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setPage(1);
                }}
                placeholder="Filter by updated date"
                className="w-[180px]"
              />
            </div>

            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Items per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={exportToJSON}
              variant="outline"
              size="sm"
              disabled={downloadingType !== null}
            >
              {downloadingType === "json" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export JSON
                </>
              )}
            </Button>
            <Button
              onClick={exportToCSV}
              variant="outline"
              size="sm"
              disabled={downloadingType !== null}
            >
              {downloadingType === "csv" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </>
              )}
            </Button>
            <Button
              onClick={downloadZip}
              variant="outline"
              size="sm"
              disabled={downloadingType !== null}
            >
              {downloadingType === "zip" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Archive className="mr-2 h-4 w-4" />
                  Download Zip
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Audio</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Krio</TableHead>
                <TableHead>English</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : audioFiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No audio files found
                  </TableCell>
                </TableRow>
              ) : (
                audioFiles.map((file) => (
                  <TableRow key={file._id}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePlay(file._id, file.url)}
                        className="h-8 w-8 p-0"
                      >
                        {playingId === file._id ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDuration(file.duration)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate text-sm">
                        {file.annotations.transcriptKrio || (
                          <span className="text-muted-foreground italic">
                            Not added
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate text-sm">
                        {file.annotations.transcriptEnglish || (
                          <span className="text-muted-foreground italic">
                            Not added
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {file.isCompleted ? (
                        <Badge variant="default">Completed</Badge>
                      ) : (
                        <Badge variant="secondary">Incomplete</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {file.groupName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {file.groupAssigned || "Unassigned"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          href={`/controls/groups/${file.groupId}?audio=${file._id}`}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
