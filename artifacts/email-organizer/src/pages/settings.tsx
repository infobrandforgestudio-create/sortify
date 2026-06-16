import { useGetSyncStatus, useTriggerSync, getGetSyncStatusQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, RefreshCw, CheckCircle2, XCircle, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function Settings() {
  const { data: syncStatus, isLoading } = useGetSyncStatus();
  const triggerSync = useTriggerSync();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSync = () => {
    triggerSync.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Sync Started",
          description: "Fetching latest emails from Gmail...",
        });
        queryClient.invalidateQueries({ queryKey: getGetSyncStatusQueryKey() });
      },
      onError: () => {
        toast({
          title: "Sync Failed",
          description: "Could not trigger sync. Check your connection.",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage connections and sync preferences.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Gmail Connection
            </CardTitle>
            <CardDescription>Connect your Google Workspace or Gmail account to enable syncing.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-16 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-muted/50 border border-border flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${syncStatus?.connected ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'}`}>
                    {syncStatus?.connected ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {syncStatus?.connected ? "Account Connected" : "Not Connected"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {syncStatus?.connected 
                        ? "Sortify has access to read and organize your inbox." 
                        : "Sortify needs access to your inbox to function."}
                    </p>
                  </div>
                </div>
                {!syncStatus?.connected && (
                  <Button variant="outline">Connect Gmail</Button>
                )}
              </div>
            )}
            
            {syncStatus?.message && !syncStatus.connected && (
              <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20">
                {syncStatus.message}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              Synchronization
            </CardTitle>
            <CardDescription>Manually trigger a sync or review sync history.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-card border border-border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Last Synced</p>
                <p className="font-semibold">
                  {syncStatus?.lastSyncAt 
                    ? format(new Date(syncStatus.lastSyncAt), "MMM d, yyyy 'at' h:mm a") 
                    : "Never"}
                </p>
              </div>
              <div className="p-4 bg-card border border-border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total Indexed</p>
                <p className="font-semibold">{syncStatus?.totalEmails || 0} emails</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 border border-border bg-card rounded-lg">
              <Settings2 className="w-8 h-8 text-muted-foreground p-1" />
              <div className="flex-1">
                <p className="font-medium text-sm">Background Sync</p>
                <p className="text-xs text-muted-foreground">Automatically fetch and sort emails every 15 minutes.</p>
              </div>
              <div className="text-sm font-medium text-primary">Active</div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t border-border mt-4 py-4 flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Manual syncs process the last 100 emails.
            </p>
            <Button 
              onClick={handleSync} 
              disabled={!syncStatus?.connected || syncStatus?.isSyncing || triggerSync.isPending}
            >
              {syncStatus?.isSyncing || triggerSync.isPending ? "Syncing..." : "Force Sync Now"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
