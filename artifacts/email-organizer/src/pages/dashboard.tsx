import { useState } from "react";
import { useGetStats, useGetSyncStatus, useTriggerSync, getGetStatsQueryKey, getGetSyncStatusQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Inbox, Tags, Archive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatShortDate } from "@/lib/format";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetStats();
  const { data: syncStatus, isLoading: syncLoading } = useGetSyncStatus();
  
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
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      },
      onError: (err) => {
        toast({
          title: "Sync Failed",
          description: "Could not trigger sync. Check settings.",
          variant: "destructive"
        });
      }
    });
  };

  const isSyncing = syncStatus?.isSyncing || triggerSync.isPending;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">Your email command center overview.</p>
        </div>
        
        <Button 
          onClick={handleSync} 
          disabled={isSyncing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? "Syncing..." : "Sync Now"}
        </Button>
      </div>

      {(statsLoading || syncLoading) ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 flex flex-col justify-center">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Emails</p>
                    <h3 className="text-4xl font-bold tracking-tight text-foreground">{stats.totalEmails}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Inbox className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex flex-col justify-center">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Categorized</p>
                    <h3 className="text-4xl font-bold tracking-tight text-foreground">{stats.categorizedEmails}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-600">
                    <Tags className="w-5 h-5" />
                  </div>
                </div>
                <Progress 
                  value={stats.totalEmails > 0 ? (stats.categorizedEmails / stats.totalEmails) * 100 : 0} 
                  className="h-1 mt-4" 
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex flex-col justify-center">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Uncategorized</p>
                    <h3 className="text-4xl font-bold tracking-tight text-foreground">{stats.uncategorizedEmails}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-600">
                    <Archive className="w-5 h-5" />
                  </div>
                </div>
                <Progress 
                  value={stats.totalEmails > 0 ? (stats.uncategorizedEmails / stats.totalEmails) * 100 : 0} 
                  className="h-1 mt-4"
                  // we can customize colors later if needed
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
                <CardDescription>Emails sorted by your custom categories</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.emailsPerCategory.length > 0 ? (
                  <div className="space-y-4">
                    {stats.emailsPerCategory.map(cat => (
                      <div key={cat.categoryId} className="flex items-center justify-between group">
                        <Link href={`/categories/${cat.categoryId}`} className="flex items-center gap-3 hover:underline">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="font-medium text-sm">{cat.name}</span>
                        </Link>
                        <span className="text-sm text-muted-foreground tabular-nums bg-muted px-2 py-0.5 rounded-md">
                          {cat.count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    No categories defined yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>Connection and sync details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-border">
                    <div>
                      <p className="font-medium text-sm">Gmail Connection</p>
                      <p className="text-xs text-muted-foreground">Is the app authorized?</p>
                    </div>
                    <div>
                      {syncStatus?.connected ? (
                        <span className="text-xs font-medium bg-green-500/10 text-green-600 px-2.5 py-1 rounded-full">Connected</span>
                      ) : (
                        <span className="text-xs font-medium bg-destructive/10 text-destructive px-2.5 py-1 rounded-full">Disconnected</span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pb-4 border-b border-border">
                    <div>
                      <p className="font-medium text-sm">Last Sync</p>
                      <p className="text-xs text-muted-foreground">When emails were last fetched</p>
                    </div>
                    <div className="text-sm font-medium">
                      {syncStatus?.lastSyncAt ? formatShortDate(syncStatus.lastSyncAt) : "Never"}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">Active Rules</p>
                      <p className="text-xs text-muted-foreground">Total sorting categories</p>
                    </div>
                    <div className="text-sm font-medium">
                      {stats.totalCategories} categories
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
