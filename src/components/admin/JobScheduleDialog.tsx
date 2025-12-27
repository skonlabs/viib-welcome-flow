import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays, addWeeks, addMonths, setHours, setMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Clock } from "@/icons";

interface JobScheduleDialogProps {
  jobName: string;
  currentNextRun: string | null;
  onSchedule: (nextRunAt: string, recurrence: RecurrenceConfig | null) => Promise<void>;
}

export interface RecurrenceConfig {
  type: 'once' | 'daily' | 'weekly' | 'monthly';
  time: string; // HH:mm format
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
}

export const JobScheduleDialog = ({ jobName, currentNextRun, onSchedule }: JobScheduleDialogProps) => {
  const [open, setOpen] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('once');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    currentNextRun ? new Date(currentNextRun) : new Date()
  );
  const [selectedTime, setSelectedTime] = useState<string>(
    currentNextRun ? format(new Date(currentNextRun), "HH:mm") : "02:00"
  );
  const [dayOfWeek, setDayOfWeek] = useState<number>(0); // Sunday
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selectedDate && recurrenceType === 'once') return;
    
    setSaving(true);
    try {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      let nextRunDate: Date;
      
      if (recurrenceType === 'once' && selectedDate) {
        nextRunDate = setMinutes(setHours(selectedDate, hours), minutes);
      } else if (recurrenceType === 'daily') {
        // Next occurrence at specified time
        const now = new Date();
        nextRunDate = setMinutes(setHours(now, hours), minutes);
        if (nextRunDate <= now) {
          nextRunDate = addDays(nextRunDate, 1);
        }
      } else if (recurrenceType === 'weekly') {
        // Next occurrence on specified day at specified time
        const now = new Date();
        const currentDay = now.getDay();
        let daysUntil = dayOfWeek - currentDay;
        if (daysUntil <= 0) daysUntil += 7;
        nextRunDate = addDays(now, daysUntil);
        nextRunDate = setMinutes(setHours(nextRunDate, hours), minutes);
        if (nextRunDate <= now) {
          nextRunDate = addWeeks(nextRunDate, 1);
        }
      } else {
        // Monthly - next occurrence on specified day at specified time
        const now = new Date();
        nextRunDate = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, hours, minutes);
        if (nextRunDate <= now) {
          nextRunDate = addMonths(nextRunDate, 1);
        }
      }
      
      const recurrenceConfig: RecurrenceConfig | null = recurrenceType === 'once' ? null : {
        type: recurrenceType,
        time: selectedTime,
        ...(recurrenceType === 'weekly' && { dayOfWeek }),
        ...(recurrenceType === 'monthly' && { dayOfMonth }),
      };
      
      await onSchedule(nextRunDate.toISOString(), recurrenceConfig);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const getSchedulePreview = () => {
    const [hours, minutes] = selectedTime.split(':');
    const timeStr = `${hours}:${minutes}`;
    
    switch (recurrenceType) {
      case 'once':
        return selectedDate ? `Once on ${format(selectedDate, "PPP")} at ${timeStr}` : 'Select a date';
      case 'daily':
        return `Every day at ${timeStr}`;
      case 'weekly':
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `Every ${days[dayOfWeek]} at ${timeStr}`;
      case 'monthly':
        return `Monthly on day ${dayOfMonth} at ${timeStr}`;
      default:
        return 'Invalid schedule';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarIcon className="w-4 h-4 mr-2" />
          Schedule
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule {jobName}</DialogTitle>
          <DialogDescription>
            Set when this job should run automatically
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Recurrence Type */}
          <div className="space-y-2">
            <Label>Recurrence</Label>
            <Select value={recurrenceType} onValueChange={(v) => setRecurrenceType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once">Run Once</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date picker for one-time runs */}
          {recurrenceType === 'once' && (
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Day of week for weekly */}
          {recurrenceType === 'weekly' && (
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Day of month for monthly */}
          {recurrenceType === 'monthly' && (
            <div className="space-y-2">
              <Label>Day of Month</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Math.min(31, Math.max(1, Number(e.target.value))))}
              />
              <p className="text-xs text-muted-foreground">
                If day doesn't exist in a month, job runs on last day
              </p>
            </div>
          )}

          {/* Time picker */}
          <div className="space-y-2">
            <Label>Time (24-hour format)</Label>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <Input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium mb-1">Schedule Preview</div>
            <div className="text-sm text-muted-foreground">
              {getSchedulePreview()}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Schedule'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
