import { useState } from "react";
import { useCreateEmail } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AddEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddEmailDialog({ open, onOpenChange }: AddEmailDialogProps) {
  const queryClient = useQueryClient();
  const { mutate: createEmail, isPending } = useCreateEmail({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast.success("Email added and categorized.");
        onOpenChange(false);
        setForm({ subject: "", fromAddress: "", body: "" });
      },
      onError: () => {
        toast.error("Failed to add email.");
      },
    },
  });

  const [form, setForm] = useState({ subject: "", fromAddress: "", body: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.fromAddress.trim() || !form.body.trim()) return;
    createEmail({ data: form });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Email</DialogTitle>
          <DialogDescription>
            Manually add an email. If you have categories set up, the AI will automatically sort it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="fromAddress">From</Label>
            <Input
              id="fromAddress"
              placeholder="sender@example.com"
              value={form.fromAddress}
              onChange={(e) => setForm((f) => ({ ...f, fromAddress: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Email subject"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              placeholder="Email content..."
              rows={6}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              required
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !form.subject || !form.fromAddress || !form.body}>
              {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding…</> : "Add Email"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
