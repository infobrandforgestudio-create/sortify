import { useState } from "react";
import {
  useGetSyncStatus,
  useTriggerSync,
  useGetImapConfig,
  useSaveImapConfig,
  useTestImapConfig,
  getGetSyncStatusQueryKey,
  getGetImapConfigQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, RefreshCw, CheckCircle2, XCircle, Settings2, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const PROVIDERS = [
  { label: "Gmail", host: "imap.gmail.com", port: 993 },
  { label: "Outlook / Hotmail", host: "outlook.office365.com", port: 993 },
  { label: "Yahoo Mail", host: "imap.mail.yahoo.com", port: 993 },
  { label: "iCloud Mail", host: "imap.mail.me.com", port: 993 },
  { label: "Custom / Other", host: "", port: 993 },
];

interface FormState {
  provider: string;
  email: string;
  imapHost: string;
  imapPort: string;
  username: string;
  password: string;
  useSsl: boolean;
}

const DEFAULT_FORM: FormState = {
  provider: "Gmail",
  email: "",
  imapHost: "imap.gmail.com",
  imapPort: "993",
  username: "",
  password: "",
  useSsl: true,
};

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: syncStatus, isLoading: syncLoading } = useGetSyncStatus();
  const { data: imapConfig, isLoading: configLoading } = useGetImapConfig();
  const triggerSync = useTriggerSync();
  const saveConfig = useSaveImapConfig();
  const testConfig = useTestImapConfig();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const startEditing = () => {
    if (imapConfig?.configured) {
      const provider = PROVIDERS.find((p) => p.host === imapConfig.imapHost) ?? PROVIDERS[4];
      setForm({
        provider: provider.label,
        email: imapConfig.email ?? "",
        imapHost: imapConfig.imapHost ?? "",
        imapPort: String(imapConfig.imapPort ?? 993),
        username: imapConfig.username ?? "",
        password: "",
        useSsl: imapConfig.useSsl ?? true,
      });
    } else {
      setForm(DEFAULT_FORM);
    }
    setTestResult(null);
    setEditing(true);
  };

  const handleProviderChange = (label: string) => {
    const p = PROVIDERS.find((x) => x.label === label) ?? PROVIDERS[4];
    setForm((f) => ({ ...f, provider: label, imapHost: p.host, imapPort: String(p.port) }));
  };

  const handleTest = () => {
    setTestResult(null);
    testConfig.mutate(
      {
        data: {
          email: form.email,
          imapHost: form.imapHost,
          imapPort: Number(form.imapPort),
          username: form.username || form.email,
          password: form.password,
          useSsl: form.useSsl,
        },
      },
      {
        onSuccess: (result) => setTestResult(result),
        onError: () => setTestResult({ success: false, message: "Test request failed." }),
      }
    );
  };

  const handleSave = () => {
    saveConfig.mutate(
      {
        data: {
          email: form.email,
          imapHost: form.imapHost,
          imapPort: Number(form.imapPort),
          username: form.username || form.email,
          password: form.password,
          useSsl: form.useSsl,
        },
      },
      {
        onSuccess: () => {
          toast.success("Email account connected!");
          queryClient.invalidateQueries({ queryKey: getGetImapConfigQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetSyncStatusQueryKey() });
          setEditing(false);
        },
        onError: () => toast.error("Failed to save settings."),
      }
    );
  };

  const handleSync = () => {
    triggerSync.mutate(undefined, {
      onSuccess: () => {
        toast.success("Sync started — fetching your emails…");
        queryClient.invalidateQueries({ queryKey: getGetSyncStatusQueryKey() });
      },
      onError: () => toast.error("Could not trigger sync."),
    });
  };

  const isFormValid = form.email && form.imapHost && form.imapPort && form.password;

  return (
    <div className="space-y-8 max-w-3xl mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Connect your email and manage sync preferences.</p>
      </div>

      <div className="grid gap-6">
        {/* Email Connection Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  Email Connection
                </CardTitle>
                <CardDescription className="mt-1">
                  Connect any email account via IMAP using an app password.
                </CardDescription>
              </div>
              {imapConfig?.configured && !editing && (
                <Button variant="outline" size="sm" onClick={startEditing}>
                  <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {configLoading ? (
              <div className="flex items-center justify-center h-16">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : !editing && imapConfig?.configured ? (
              /* Connected state */
              <div className="p-4 rounded-lg bg-muted/50 border border-border flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{imapConfig.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {imapConfig.imapHost}:{imapConfig.imapPort} · {imapConfig.useSsl ? "SSL" : "no SSL"}
                  </p>
                </div>
              </div>
            ) : !editing ? (
              /* Not configured */
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 border border-border flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">No account connected</p>
                    <p className="text-sm text-muted-foreground">Connect an email account to start syncing.</p>
                  </div>
                  <Button onClick={startEditing}>Connect Email</Button>
                </div>

                <div className="p-3 rounded-md bg-muted/30 border border-border text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">How to get an app password:</p>
                  <ul className="list-disc ml-4 space-y-0.5">
                    <li><span className="font-medium">Gmail:</span> Google Account → Security → 2-Step Verification → App passwords</li>
                    <li><span className="font-medium">Outlook:</span> Microsoft Account → Security → Advanced security → App passwords</li>
                    <li><span className="font-medium">Yahoo:</span> Account Security → App passwords</li>
                    <li><span className="font-medium">iCloud:</span> Apple ID → Sign-In & Security → App-Specific Passwords</li>
                  </ul>
                </div>
              </div>
            ) : (
              /* Edit / Connect form */
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Email Provider</Label>
                  <Select value={form.provider} onValueChange={handleProviderChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((p) => (
                        <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@gmail.com"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value, username: f.username || e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">App Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="xxxx xxxx xxxx xxxx"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    />
                  </div>
                </div>

                {form.provider === "Custom / Other" && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-1.5">
                      <Label htmlFor="imapHost">IMAP Host</Label>
                      <Input
                        id="imapHost"
                        placeholder="imap.example.com"
                        value={form.imapHost}
                        onChange={(e) => setForm((f) => ({ ...f, imapHost: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="imapPort">Port</Label>
                      <Input
                        id="imapPort"
                        type="number"
                        value={form.imapPort}
                        onChange={(e) => setForm((f) => ({ ...f, imapPort: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                {testResult && (
                  <div className={`p-3 rounded-md text-sm border ${testResult.success ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400" : "bg-destructive/10 border-destructive/20 text-destructive"}`}>
                    {testResult.message}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <Button
                    variant="outline"
                    onClick={handleTest}
                    disabled={!isFormValid || testConfig.isPending}
                  >
                    {testConfig.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Testing…</> : "Test Connection"}
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!isFormValid || saveConfig.isPending}
                  >
                    {saveConfig.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Save & Connect"}
                  </Button>
                  <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sync Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              Synchronization
            </CardTitle>
            <CardDescription>Trigger a sync or review history.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                <p className="font-semibold">{syncStatus?.totalEmails ?? 0} emails</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 border border-border bg-card rounded-lg">
              <Settings2 className="w-8 h-8 text-muted-foreground p-1" />
              <div className="flex-1">
                <p className="font-medium text-sm">Sync on demand</p>
                <p className="text-xs text-muted-foreground">Fetches your last 100 inbox emails and categorizes them with AI.</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t border-border mt-2 py-4 flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {syncLoading ? "Checking status…" : syncStatus?.connected ? `Connected as ${imapConfig?.email ?? ""}` : "No email connected."}
            </p>
            <Button
              onClick={handleSync}
              disabled={!syncStatus?.connected || syncStatus?.isSyncing || triggerSync.isPending}
            >
              {syncStatus?.isSyncing || triggerSync.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing…</>
                : "Sync Now"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
