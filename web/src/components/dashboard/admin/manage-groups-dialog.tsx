"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/panel-ui/dialog";
import { Button } from "@/components/panel-ui/button";
import { Input } from "@/components/panel-ui/input";
import { Label } from "@/components/panel-ui/label";
import { Card, CardContent } from "@/components/panel-ui/card";
import { Checkbox } from "@/components/panel-ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/panel-ui/select";
import { Users, Pencil, Check, UserPlus } from "lucide-react";
import { adminCreateGroup, adminRenameGroup, adminAddStudentToGroup } from "@/lib/lesson/service";
import type { Group, Student } from "@/lib/admin/types";

interface ManageGroupsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
  students: Student[];
  groups: Group[];
  onUpdated: () => void;
}

export function ManageGroupsDialog({ open, onOpenChange, teacherId, students, groups, onUpdated }: ManageGroupsDialogProps) {
  const [newGroupName, setNewGroupName] = useState("");
  const [newMemberIds, setNewMemberIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);

  const [addMemberSelection, setAddMemberSelection] = useState<Record<string, string>>({});
  const [addingToGroupId, setAddingToGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNewGroupName("");
      setNewMemberIds([]);
      setRenamingId(null);
      setAddMemberSelection({});
    }
  }, [open]);

  const activeStudents = students.filter((s) => !s.is_archived);
  const ungroupedStudents = activeStudents.filter((s) => !s.group_id);
  const membersOf = (groupId: string) => activeStudents.filter((s) => s.group_id === groupId);

  function toggleNewMember(studentId: string) {
    setNewMemberIds((prev) => {
      if (prev.includes(studentId)) return prev.filter((id) => id !== studentId);
      if (prev.length >= 2) {
        toast.error("Bir grupta en fazla 2 öğrenci olabilir");
        return prev;
      }
      return [...prev, studentId];
    });
  }

  async function handleCreateGroup() {
    if (!newGroupName.trim()) {
      toast.error("Grup adı/numarası girin");
      return;
    }
    if (newMemberIds.length === 0) {
      toast.error("En az 1 öğrenci seçin");
      return;
    }
    setCreating(true);
    try {
      const created = await adminCreateGroup(teacherId, newGroupName.trim());
      if (!created.success || !created.group_id) throw new Error(created.error ?? "Grup oluşturulamadı");

      for (const studentRecordId of newMemberIds) {
        const added = await adminAddStudentToGroup(studentRecordId, created.group_id, teacherId);
        if (!added.success) throw new Error(added.error ?? "Öğrenci gruba eklenemedi");
      }

      toast.success("Grup oluşturuldu");
      setNewGroupName("");
      setNewMemberIds([]);
      onUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Grup oluşturulamadı");
    } finally {
      setCreating(false);
    }
  }

  async function handleRename(groupId: string) {
    if (!renameValue.trim()) return;
    setRenaming(true);
    try {
      const result = await adminRenameGroup(groupId, teacherId, renameValue.trim());
      if (!result.success) throw new Error(result.error ?? "Grup adı güncellenemedi");
      toast.success("Grup adı güncellendi");
      setRenamingId(null);
      onUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Grup adı güncellenemedi");
    } finally {
      setRenaming(false);
    }
  }

  async function handleAddMember(groupId: string) {
    const studentRecordId = addMemberSelection[groupId];
    if (!studentRecordId) return;
    setAddingToGroupId(groupId);
    try {
      const result = await adminAddStudentToGroup(studentRecordId, groupId, teacherId);
      if (!result.success) throw new Error(result.error ?? "Öğrenci gruba eklenemedi");
      toast.success("Öğrenci gruba eklendi");
      setAddMemberSelection((prev) => ({ ...prev, [groupId]: "" }));
      onUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Öğrenci gruba eklenemedi");
    } finally {
      setAddingToGroupId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Grup Dersleri
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <h4 className="text-sm font-medium mb-2">Mevcut Gruplar</h4>
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">Henüz grup yok.</p>
            ) : (
              <div className="space-y-2">
                {groups.map((group) => {
                  const members = membersOf(group.id);
                  const hasOpenSlot = members.length < 2;
                  return (
                    <Card key={group.id} className="border">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          {renamingId === group.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                className="h-8"
                                autoFocus
                              />
                              <Button size="sm" className="h-8 px-2" disabled={renaming} onClick={() => handleRename(group.id)}>
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{group.name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  setRenamingId(group.id);
                                  setRenameValue(group.name);
                                }}
                              >
                                <Pencil className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {members.length === 0 ? (
                            <span className="text-xs text-muted-foreground">Üye yok</span>
                          ) : (
                            members.map((m) => (
                              <span key={m.id} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                                {m.profiles.full_name}
                              </span>
                            ))
                          )}
                        </div>

                        {hasOpenSlot && ungroupedStudents.length > 0 && (
                          <div className="flex items-center gap-2 pt-1">
                            <Select
                              value={addMemberSelection[group.id] ?? ""}
                              onValueChange={(value) => setAddMemberSelection((prev) => ({ ...prev, [group.id]: value }))}
                            >
                              <SelectTrigger className="h-8 flex-1">
                                <SelectValue placeholder="Öğrenci seç..." />
                              </SelectTrigger>
                              <SelectContent>
                                {ungroupedStudents.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.profiles.full_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              className="h-8"
                              disabled={!addMemberSelection[group.id] || addingToGroupId === group.id}
                              onClick={() => handleAddMember(group.id)}
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <h4 className="text-sm font-medium">Yeni Grup Oluştur</h4>
            <div className="space-y-2">
              <Label htmlFor="groupName">Grup Adı / Numarası</Label>
              <Input
                id="groupName"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Örn. Grup 1"
              />
            </div>
            <div className="space-y-2">
              <Label>Öğrenciler (en fazla 2)</Label>
              {ungroupedStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Gruplanmamış aktif öğrenci yok.</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto rounded-md border p-2">
                  {ungroupedStudents.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={newMemberIds.includes(s.id)} onCheckedChange={() => toggleNewMember(s.id)} />
                      {s.profiles.full_name}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <Button className="w-full" disabled={creating} onClick={handleCreateGroup}>
              {creating ? "Oluşturuluyor..." : "Grup Oluştur"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
