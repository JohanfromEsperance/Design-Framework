import { useListJournalEntries, useCreateJournalEntry, useDeleteJournalEntry, getListJournalEntriesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Calendar } from "lucide-react";

interface JournalTabProps {
  tripId: number;
}

export default function JournalTab({ tripId }: JournalTabProps) {
  const { data: entries, isLoading } = useListJournalEntries(tripId);
  const createEntry = useCreateJournalEntry();
  const deleteEntry = useDeleteJournalEntry();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleCreate = () => {
    createEntry.mutate({
      tripId,
      data: {
        weekDate: new Date().toISOString().split('T')[0],
        whereWere: "On the road",
        weekSummary: "A great week of traveling."
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListJournalEntriesQueryKey(tripId) });
        toast({ title: "Journal entry created" });
      }
    });
  };

  if (isLoading) return <div>Loading journals...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-foreground">Travel Journal</h2>
        <Button onClick={handleCreate} disabled={createEntry.isPending}>
          <Plus className="mr-2 h-4 w-4" /> New Entry
        </Button>
      </div>

      <div className="grid gap-6">
        {entries?.map(entry => (
          <Card key={entry.id} className="bg-card">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div>
                <CardTitle className="text-lg flex items-center">
                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                  {entry.weekDate}
                </CardTitle>
                <p className="text-sm font-medium text-primary mt-1">{entry.whereWere}</p>
              </div>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => {
                if(confirm("Delete this entry?")) {
                  deleteEntry.mutate({ tripId, journalEntryId: entry.id }, {
                    onSuccess: () => {
                      queryClient.invalidateQueries({ queryKey: getListJournalEntriesQueryKey(tripId) });
                      toast({ title: "Entry deleted" });
                    }
                  });
                }
              }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-foreground whitespace-pre-wrap">{entry.weekSummary}</p>
            </CardContent>
          </Card>
        ))}
        
        {entries?.length === 0 && (
          <div className="text-center py-12 bg-card rounded-lg border border-border">
            <p className="text-muted-foreground">No journal entries yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}