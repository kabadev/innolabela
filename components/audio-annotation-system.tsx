"use client";

import { useState } from "react";
import { GroupsList } from "./groups-list";
import { GroupDetail } from "./group-detail";

export interface AudioFile {
  id: string;
  file?: File;
  url: string;
  name: string;
  duration: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AudioAnnotations {
  transcriptEnglish: string;
  transcriptKrio: string;
  category: string;
  status: "pending" | "krio_done" | "english_done" | "completed" | "verified";
  speakerTags?: { time: number; label: string }[];
}

export interface AudioFileWithSegments extends AudioFile {
  annotations?: AudioAnnotations;
  groupId: string;
}

export interface AudioGroup {
  id: string;
  name: string;
  dateAdded: Date;
  assigned?: any;
  audioFiles: AudioFileWithSegments[];
}

export function AudioAnnotationSystem() {
  const [groups, setGroups] = useState<AudioGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<AudioGroup | null>(null);
  const [selectedAudio, setSelectedAudio] =
    useState<AudioFileWithSegments | null>(null);
  const [view, setView] = useState<"groups" | "group-detail">("groups");

  const handleFilesUploaded = (files: AudioFile[], groupId?: string) => {
    let targetGroup: AudioGroup;

    if (groupId) {
      // Adding to existing group
      const group = groups.find((g) => g.id === groupId);
      if (!group) return;

      const filesWithSegments: AudioFileWithSegments[] = files.map((file) => ({
        ...file,
        groupId: group.id,
        annotations: {
          transcriptEnglish: "",
          transcriptKrio: "",
          category: "",
          status: "pending",
          speakerTags: [],
        },
      }));

      targetGroup = {
        ...group,
        audioFiles: [...group.audioFiles, ...filesWithSegments],
      };

      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? targetGroup : g))
      );
    } else {
      // Create new group
      const newGroupId = `group-${Date.now()}`;
      const filesWithSegments: AudioFileWithSegments[] = files.map((file) => ({
        ...file,
        groupId: newGroupId,
        annotations: {
          transcriptEnglish: "",
          transcriptKrio: "",
          category: "",
          status: "pending",
          speakerTags: [],
        },
      }));

      targetGroup = {
        id: newGroupId,
        name: `Group ${groups.length + 1}`,
        dateAdded: new Date(),
        audioFiles: filesWithSegments,
      };

      setGroups((prev) => [...prev, targetGroup]);
    }

    setSelectedGroup(targetGroup);
    setView("group-detail");
  };

  const handleSaveAnnotations = (annotations: AudioAnnotations) => {
    if (!selectedAudio || !selectedGroup) return;

    const updatedGroup = {
      ...selectedGroup,
      audioFiles: selectedGroup.audioFiles.map((file) =>
        file.id === selectedAudio.id ? { ...file, annotations } : file
      ),
    };

    setGroups((prev) =>
      prev.map((g) => (g.id === selectedGroup.id ? updatedGroup : g))
    );
    setSelectedGroup(updatedGroup);
    setSelectedAudio((prev) => (prev ? { ...prev, annotations } : null));
  };

  const handleSelectGroup = (group: AudioGroup) => {
    setSelectedGroup(group);
    setView("group-detail");
  };

  const handleSelectAudio = (audio: AudioFileWithSegments) => {
    setSelectedAudio(audio);
  };

  const handleBackToGroups = () => {
    setSelectedGroup(null);
    setSelectedAudio(null);
    setView("groups");
  };

  const handleDeleteGroup = (groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    if (selectedGroup?.id === groupId) {
      handleBackToGroups();
    }
  };

  const handleDeleteAudio = (audioId: string) => {
    if (!selectedGroup) return;

    const updatedGroup = {
      ...selectedGroup,
      audioFiles: selectedGroup.audioFiles.filter(
        (file) => file.id !== audioId
      ),
    };

    setGroups((prev) =>
      prev.map((g) => (g.id === selectedGroup.id ? updatedGroup : g))
    );
    setSelectedGroup(updatedGroup);

    if (selectedAudio?.id === audioId) {
      setSelectedAudio(null);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-background p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Audio Annotation System</h1>
            {view === "group-detail" && selectedGroup && (
              <p className="text-sm text-muted-foreground mt-1">
                {selectedGroup.name} • {selectedGroup.audioFiles.length} / 100
                files
                {selectedAudio && ` • ${selectedAudio.name}`}
              </p>
            )}
          </div>
          {view !== "groups" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <button
                onClick={handleBackToGroups}
                className="hover:text-foreground transition-colors"
              >
                Groups
              </button>
              {selectedGroup && (
                <>
                  <span>/</span>
                  <span className="text-foreground font-medium">
                    {selectedGroup.name}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {view === "groups" && (
          <GroupsList
            groups={groups}
            onSelectGroup={handleSelectGroup}
            onDeleteGroup={handleDeleteGroup}
            onCreateGroup={handleFilesUploaded}
          />
        )}

        {view === "group-detail" && selectedGroup && (
          <GroupDetail
            group={selectedGroup}
            onSelectAudio={handleSelectAudio}
            onDeleteAudio={handleDeleteAudio}
            onBack={handleBackToGroups}
            onAddFiles={handleFilesUploaded}
            onSaveAnnotations={handleSaveAnnotations}
          />
        )}
      </div>
    </div>
  );
}
