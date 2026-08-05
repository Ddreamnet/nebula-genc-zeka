"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/panel-ui/dialog";
import { WeeklyScheduleGrid } from "./weekly-schedule-grid";

interface WeeklyScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId: string;
}

export function WeeklyScheduleDialog({ open, onOpenChange, teacherId }: WeeklyScheduleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Haftalık Ders Programı</DialogTitle>
        </DialogHeader>
        {open && <WeeklyScheduleGrid teacherId={teacherId} />}
      </DialogContent>
    </Dialog>
  );
}
