import {
  useListJournalEntries,
  useCreateJournalEntry,
  useUpdateJournalEntry,
  useDeleteJournalEntry,
  getListJournalEntriesQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Calendar, ChevronDown, ChevronUp, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { VoiceField } from "@/components/voice-button";

interface JournalTabProps {
  tripId: number;
}

interface EntryState {
  weekDate: string;
  whereWere: string;
  destinations: string;
  weather: string;
  weekSummary: string;
  loved: string;
  learned: string;
}

function JournalEntryEditor({
  tripId,
  entryId,
  initial,
  onSaved,
  onDelete,
}: {
  tripId: number;
  entryId: number;
  initial: EntryState;
  onSaved: () => void;
  onDelete: () => void;
}) {
  const [data, setData] = useState<EntryState>(initial);
  const [expanded, setExpanded] = useState(entryId < 0);
  const updateEntry = useUpdateJournalEntry();
  const { toast } = useToast();

  const set = (field: keyof EntryState) => (value: string) =>
    setData((d) => ({ ...d, [field]: value }));

  const handleSave = () => {
    updateEntry.mutate(
      { tripId, journalEntryId: entryId, data },
      {
        onSuccess: () => {
          onSaved();
          toast({ title: "Journal entry saved" });
        },
      }
    );
  };

  return (
    <Card className="bg-card border border-border overflow-hidden">
      <CardHeader
        className="flex flex-row items-center justify-between pb-3 cursor-pointer select-none"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <CardTitle className="text-base">{data.weekDate || "New Entry"}</CardTitle>
            {data.whereWere && (
              <p className="text-sm text-primary truncate">{data.whereWere}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-5 border-t border-border pt-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <VoiceField value={data.weekDate} onChange={set("weekDate")}>
                <Input
                  type="date"
                  value={data.weekDate}
                  onChange={(e) => set("weekDate")(e.target.value)}
                />
              </VoiceField>
            </div>
            <div className="space-y-1.5">
              <Label>Weather</Label>
              <VoiceField value={data.weather} onChange={set("weather")}>
                <Input
                  value={data.weather}
                  onChange={(e) => set("weather")(e.target.value)}
                  placeholder="Sunny, 32°C, light breeze"
                />
              </VoiceField>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Where We Were</Label>
            <VoiceField value={data.whereWere} onChange={set("whereWere")}>
              <Input
                value={data.whereWere}
                onChange={(e) => set("whereWere")(e.target.value)}
                placeholder="Town or region"
              />
            </VoiceField>
          </div>

          <div className="space-y-1.5">
            <Label>Destination(s)</Label>
            <VoiceField value={data.destinations} onChange={set("destinations")}>
              <Input
                value={data.destinations}
                onChange={(e) => set("destinations")(e.target.value)}
                placeholder="Where we headed next"
              />
            </VoiceField>
          </div>

          <div className="space-y-1.5">
            <Label>Our Week Went Like This...</Label>
            <VoiceField value={data.weekSummary} onChange={set("weekSummary")} speakable appendMode>
              <Textarea
                rows={6}
                value={data.weekSummary}
                onChange={(e) => set("weekSummary")(e.target.value)}
                placeholder="Describe the week in your own words..."
                className="resize-none leading-relaxed"
              />
            </VoiceField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>We Loved...</Label>
              <VoiceField value={data.loved} onChange={set("loved")} speakable appendMode>
                <Textarea
                  rows={3}
                  value={data.loved}
                  onChange={(e) => set("loved")(e.target.value)}
                  placeholder="Best moments, places, experiences"
                  className="resize-none"
                />
              </VoiceField>
            </div>
            <div className="space-y-1.5">
              <Label>We Learned...</Label>
              <VoiceField value={data.learned} onChange={set("learned")} speakable appendMode>
                <Textarea
                  rows={3}
                  value={data.learned}
                  onChange={(e) => set("learned")(e.target.value)}
                  placeholder="Tips, lessons, things to do differently"
                  className="resize-none"
                />
              </VoiceField>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={updateEntry.isPending}>
              <Save className="mr-2 h-4 w-4" /> Save Entry
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function JournalTab({ tripId }: JournalTabProps) {
  const { data: entries, isLoading } = useListJournalEntries(tripId);
  const createEntry = useCreateJournalEntry();
  const deleteEntry = useDeleteJournalEntry();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleCreate = () => {
    createEntry.mutate(
      {
        tripId,
        data: {
          weekDate: new Date().toISOString().split("T")[0],
          whereWere: "",
          weekSummary: "",
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListJournalEntriesQueryKey(tripId) });
          toast({ title: "New journal entry created" });
        },
      }
    );
  };

  const handleDelete = (entryId: number) => {
    if (!confirm("Delete this entry?")) return;
    deleteEntry.mutate(
      { tripId, journalEntryId: entryId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListJournalEntriesQueryKey(tripId) });
          toast({ title: "Entry deleted" });
        },
      }
    );
  };

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading journal...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-foreground">Travel Journal</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {entries?.length ?? 0} {entries?.length === 1 ? "entry" : "entries"} — click to expand and edit
          </p>
        </div>
        <Button onClick={handleCreate} disabled={createEntry.isPending}>
          <Plus className="mr-2 h-4 w-4" /> New Entry
        </Button>
      </div>

      <div className="grid gap-4">
        {entries?.map((entry) => (
          <JournalEntryEditor
            key={entry.id}
            tripId={tripId}
            entryId={entry.id}
            initial={{
              weekDate: entry.weekDate || "",
              whereWere: entry.whereWere || "",
              destinations: entry.destinations || "",
              weather: entry.weather || "",
              weekSummary: entry.weekSummary || "",
              loved: entry.loved || "",
              learned: entry.learned || "",
            }}
            onSaved={() => queryClient.invalidateQueries({ queryKey: getListJournalEntriesQueryKey(tripId) })}
            onDelete={() => handleDelete(entry.id)}
          />
        ))}

        {entries?.length === 0 && (
          <div className="text-center py-16 bg-card rounded-lg border border-border">
            <p className="text-muted-foreground">
              No journal entries yet. Start writing about your adventure.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
