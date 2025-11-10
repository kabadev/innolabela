"use client";

import type React from "react";

import { use, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User } from "@/lib/type";
import Image from "next/image";

interface AssignGroupDialogProps {
  users: User[];
  groups: any;
  open: boolean;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (userId: string, groupId: string) => void;
}

export function AssignGroupDialog({
  users,
  groups,
  open,
  loading,
  onOpenChange,
  onAssign,
}: AssignGroupDialogProps) {
  const [userId, setUserId] = useState("");
  const [groupId, setGroupId] = useState("");

  const handleSubmit = () => {
    try {
      if (userId && groupId) {
        onAssign(userId, groupId);
        setUserId("");
        setGroupId("");
      }
    } catch (error) {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Group to User</DialogTitle>
          <DialogDescription>
            Grant a user access to an audio group
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user">Select User</Label>
              <Select value={userId} onValueChange={setUserId} required>
                <SelectTrigger className="w-full py-6">
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((user) => (
                    <SelectItem
                      key={user.id}
                      value={user.id}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-4 ">
                        <Image
                          src={user.photo!}
                          width={100}
                          height={100}
                          alt=""
                          className="w-8 h-8"
                        />
                        <h2>
                          {user.firstName} {user.lastName}
                        </h2>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="group">Select Group</Label>
              <Select value={groupId} onValueChange={setGroupId} required>
                <SelectTrigger className="py-6 w-full">
                  <SelectValue placeholder="Choose a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group: any) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              type="button"
              disabled={!userId || !groupId || loading}
            >
              {loading ? "Assigning..." : "Assign Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
