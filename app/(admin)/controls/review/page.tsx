"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  FileAudio,
  CheckCircle,
  XCircle,
  ShieldCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  getFilesForReview,
  approveAnnotation,
  rejectAnnotation,
} from "@/app/actions/audit";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

export default function ReviewPage() {
  const { user } = useUser();
  const [files, setFiles] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const data = await getFilesForReview(page);
      setFiles(data.files);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error("Failed to load review queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [page]);

  const handleApprove = async (fileId: string) => {
    if (!user) return;
    setProcessingId(fileId);
    try {
      await approveAnnotation(
        fileId,
        user.id,
        `${user.firstName || ""} ${user.lastName || ""}`.trim()
      );
      toast.success("Annotation approved and verified.");
      setFiles((prev) => prev.filter((f) => f._id !== fileId));
      setTotal((prev) => prev - 1);
    } catch (err) {
      toast.error("Failed to approve annotation.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (fileId: string) => {
    if (!user || !rejectComment.trim()) {
      toast.error("Please provide a reason for rejection.");
      return;
    }
    setProcessingId(fileId);
    try {
      await rejectAnnotation(
        fileId,
        user.id,
        `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        rejectComment
      );
      toast.success("Annotation rejected and sent back for revision.");
      setFiles((prev) => prev.filter((f) => f._id !== fileId));
      setTotal((prev) => prev - 1);
      setRejectingId(null);
      setRejectComment("");
    } catch (err) {
      toast.error("Failed to reject annotation.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <main className="container mx-auto px-4 py-10 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-purple-600" />
          Review Queue
        </h1>
        <p className="text-muted-foreground mt-2">
          Review and verify completed annotations before final approval
        </p>
      </div>

      <Badge variant="secondary" className="mb-6">
        {total} file{total !== 1 ? "s" : ""} awaiting review
      </Badge>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="w-8 h-8 mx-auto animate-spin mb-3" />
          <p>Loading review queue...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">Review queue is empty</p>
          <p className="text-sm">All annotations have been reviewed</p>
        </div>
      ) : (
        <div className="space-y-4">
          {files.map((file: any) => (
            <Card key={file._id} className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <FileAudio className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{file.name}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {file.annotations?.category || "Uncategorized"}
                  </Badge>
                </div>
              </div>

              {file.annotations?.transcriptKrio && (
                <div className="mb-3 bg-muted/50 rounded-md p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">
                    Krio Transcript
                  </p>
                  <p className="text-sm">{file.annotations.transcriptKrio}</p>
                </div>
              )}

              {file.annotations?.transcriptEnglish && (
                <div className="mb-4 bg-muted/50 rounded-md p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">
                    English Transcript
                  </p>
                  <p className="text-sm">{file.annotations.transcriptEnglish}</p>
                </div>
              )}

              {rejectingId === file._id ? (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Enter reason for rejection (required)..."
                    value={rejectComment}
                    onChange={(e) => setRejectComment(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleReject(file._id)}
                      disabled={processingId === file._id || !rejectComment.trim()}
                    >
                      {processingId === file._id ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <XCircle className="w-3 h-3 mr-1" />
                      )}
                      Confirm Reject
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRejectingId(null);
                        setRejectComment("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleApprove(file._id)}
                    disabled={processingId === file._id}
                  >
                    {processingId === file._id ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <CheckCircle className="w-3 h-3 mr-1" />
                    )}
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => setRejectingId(file._id)}
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    Reject
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </main>
  );
}
