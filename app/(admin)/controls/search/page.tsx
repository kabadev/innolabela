"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, FileAudio, Loader2 } from "lucide-react";
import { searchTranscripts } from "@/app/actions/audit";
import Link from "next/link";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (query.trim().length < 2) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const data = await searchTranscripts(query);
      setResults(data);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const highlightMatch = (text: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <main className="container mx-auto px-4 py-10 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Search Transcripts</h1>
        <p className="text-muted-foreground mt-2">
          Search for words or phrases across all audio transcripts
        </p>
      </div>

      <div className="flex gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Enter search query (min 2 characters)..."
            className="pl-10 h-11"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button onClick={handleSearch} disabled={isSearching || query.trim().length < 2} className="h-11">
          {isSearching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
          Search
        </Button>
      </div>

      {isSearching && (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="w-8 h-8 mx-auto animate-spin mb-3" />
          <p>Searching transcripts...</p>
        </div>
      )}

      {!isSearching && hasSearched && results.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No results found</p>
          <p className="text-sm">Try different keywords or a shorter phrase</p>
        </div>
      )}

      {!isSearching && results.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground mb-4">
            Found {results.length} result{results.length !== 1 ? "s" : ""}
          </p>

          {results.map((file: any) => (
            <Card key={file._id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <FileAudio className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Link
                      href={`/groups/${file.groupId}?audio=${file._id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {file.name}
                    </Link>
                    {file.annotations?.status && (
                      <Badge variant="secondary" className="text-[10px]">
                        {file.annotations.status.replace("_", " ")}
                      </Badge>
                    )}
                  </div>

                  {file.annotations?.transcriptKrio && (
                    <div className="mb-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">
                        Krio
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {highlightMatch(file.annotations.transcriptKrio)}
                      </p>
                    </div>
                  )}

                  {file.annotations?.transcriptEnglish && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">
                        English
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {highlightMatch(file.annotations.transcriptEnglish)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
