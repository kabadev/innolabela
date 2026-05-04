"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { History, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { getAuditLogs } from "@/app/actions/audit";

const actionColors: Record<string, string> = {
  annotation_saved: "bg-blue-100 text-blue-700",
  status_changed: "bg-amber-100 text-amber-700",
  file_deleted: "bg-red-100 text-red-700",
  file_added: "bg-green-100 text-green-700",
  group_created: "bg-cyan-100 text-cyan-700",
  group_deleted: "bg-red-100 text-red-700",
  batch_transcribe: "bg-indigo-100 text-indigo-700",
  review_approved: "bg-emerald-100 text-emerald-700",
  review_rejected: "bg-rose-100 text-rose-700",
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const filter = actionFilter !== "all" ? { action: actionFilter } : undefined;
      const data = await getAuditLogs(page, 30, filter);
      setLogs(data.logs);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <main className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <History className="w-8 h-8" />
          Audit Logs
        </h1>
        <p className="text-muted-foreground mt-2">
          Track all annotation changes, reviews, and file operations
        </p>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="annotation_saved">Annotation Saved</SelectItem>
              <SelectItem value="status_changed">Status Changed</SelectItem>
              <SelectItem value="review_approved">Review Approved</SelectItem>
              <SelectItem value="review_rejected">Review Rejected</SelectItem>
              <SelectItem value="file_added">File Added</SelectItem>
              <SelectItem value="file_deleted">File Deleted</SelectItem>
              <SelectItem value="batch_transcribe">Batch Transcribe</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Badge variant="secondary" className="ml-auto">
          {total} total entries
        </Badge>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading logs...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No audit logs found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log: any) => (
            <Card key={log._id} className="p-3 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={actionColors[log.action] || "bg-slate-100 text-slate-700"}>
                    {log.action.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-sm font-medium">{log.userName || "System"}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</span>
                </div>
                {log.details && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{log.details}</p>
                )}
              </div>
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
            onClick={() => setPage(p => Math.max(1, p - 1))}
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
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </main>
  );
}
