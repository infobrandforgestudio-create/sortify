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
import { RefreshCw, CheckCircle2, Settings2, Loader2, ChevronLeft, ExternalLink, Sparkles, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const IS_DESKTOP = import.meta.env.VITE_DESKTOP_MODE === "true";

function AISettingsCard() {
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);

  const { data, isLoading } = useQuery<{ hasKey: boolean; openaiApiKey: string }>({
    queryKey: ["desktop-ai-settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
    enabled: IS_DESKTOP,
  });

  const save = useMutation({
    mutationFn: (key: string) =>
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openaiApiKey: key }),
      }).then((r) => r.json()),
    onSuccess: (_result, key) => {
      toast.success(key ? "API key saved" : "API key removed", {
        description: key ? "AI categorization is now active." : "Emails will sync without AI sorting.",
      });
      setKeyInput("");
    },
    onError: () => toast.error("Failed to save API key."),
  });

  if (!IS_DESKTOP || isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-4 h-4 text-primary" />
          AI Categorization
        </CardTitle>
        <CardDescription>
          Enter your OpenAI API key to enable GPT-4o-mini email sorting.
          Your key is stored locally on your machine.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data?.hasKey && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 text-sm">
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
            <span className="text-green-700 dark:text-green-400">
              API key configured — AI categorization is active.
            </span>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="openai-key">{data?.hasKey ? "Replace API key" : "OpenAI API key"}</Label>
          <div className="relative">
            <Input
              id="openai-key"
              type={showKey ? "text" : "password"}
              placeholder="sk-..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="pr-10 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Get one at{" "}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              platform.openai.com/api-keys
            </a>
          </p>
        </div>
      </CardContent>
      <CardFooter className="border-t border-border pt-4 gap-3">
        <Button
          onClick={() => save.mutate(keyInput.trim())}
          disabled={!keyInput.trim() || save.isPending}
        >
          {save.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Save Key"}
        </Button>
        {data?.hasKey && (
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => save.mutate("")}
            disabled={save.isPending}
          >
            Remove key
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

interface Provider {
  id: string;
  name: string;
  host: string;
  port: number;
  bg: string;
  border: string;
  accent: string;
  logo: React.ReactNode;
  steps: string[];
  appPasswordUrl?: string;
  placeholder?: string;
}

const PROVIDERS: Provider[] = [
  {
    id: "gmail",
    name: "Gmail",
    host: "imap.gmail.com",
    port: 993,
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    accent: "text-red-600 dark:text-red-400",
    placeholder: "you@gmail.com",
    logo: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
        <path fill="#4caf50" d="M45 16.2l-5 2.75-5 4.75V40h7a3 3 0 003-3V16.2z"/>
        <path fill="#1e88e5" d="M3 16.2l5 2.75 5 4.75V40H6a3 3 0 01-3-3V16.2z"/>
        <path fill="#e53935" d="M35 11.2L24 19.45 13 11.2 12 28l12 7 12-7-1-16.8z"/>
        <path fill="#c62828" d="M3 12.45v.55l10 7.25L24 12 13 5.45A3.06 3.06 0 003 8v4.45z"/>
        <path fill="#1565c0" d="M45 12.45v.55l-10 7.25L24 12l11-6.55A3.06 3.06 0 0145 8v4.45z"/>
      </svg>
    ),
    steps: [
      "Go to myaccount.google.com → Security",
      "Turn on 2-Step Verification (required for app passwords)",
      "Go back to Security → scroll down to App passwords",
      'Select "Mail" and your device → click Generate',
      "Copy the 16-character code and paste it as the password below",
    ],
    appPasswordUrl: "https://myaccount.google.com/apppasswords",
  },
  {
    id: "outlook",
    name: "Outlook",
    host: "outlook.office365.com",
    port: 993,
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    accent: "text-blue-600 dark:text-blue-400",
    placeholder: "you@outlook.com",
    logo: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
        <rect x="2" y="10" width="28" height="28" rx="4" fill="#0078d4"/>
        <text x="16" y="29" textAnchor="middle" fontSize="17" fontWeight="800" fill="white" fontFamily="Arial,sans-serif">O</text>
        <rect x="22" y="16" width="24" height="16" rx="3" fill="#50d9ff"/>
        <path d="M22 16l12 8 12-8" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
      </svg>
    ),
    steps: [
      "Go to account.microsoft.com → Security",
      "Under Advanced security options → App passwords",
      'Click "Create a new app password"',
      "Copy the generated password and paste it below",
    ],
    appPasswordUrl: "https://account.microsoft.com/security",
  },
  {
    id: "yahoo",
    name: "Yahoo Mail",
    host: "imap.mail.yahoo.com",
    port: 993,
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-800",
    accent: "text-purple-600 dark:text-purple-400",
    placeholder: "you@yahoo.com",
    logo: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
        <circle cx="24" cy="24" r="22" fill="#6001d2"/>
        <text x="24" y="33" textAnchor="middle" fontSize="24" fontWeight="900" fill="white" fontFamily="Arial,sans-serif">Y!</text>
      </svg>
    ),
    steps: [
      "Go to login.yahoo.com → Account Security",
      'Click "Generate app password"',
      'Select "Other app" and name it Sortify',
      "Copy the password and paste it below",
    ],
    appPasswordUrl: "https://login.yahoo.com/account/security",
  },
  {
    id: "icloud",
    name: "iCloud Mail",
    host: "imap.mail.me.com",
    port: 993,
    bg: "bg-slate-50 dark:bg-slate-800/40",
    border: "border-slate-200 dark:border-slate-700",
    accent: "text-slate-600 dark:text-slate-400",
    placeholder: "you@icloud.com",
    logo: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
        <rect width="44" height="44" x="2" y="2" rx="10" fill="#1c7aed"/>
        <path fill="white" d="M34.5 30.5a6.5 6.5 0 000-13 7 7 0 00-1.2.11A8.5 8.5 0 0016.1 22.5H16a6.5 6.5 0 000 13h18.5z"/>
      </svg>
    ),
    steps: [
      "Go to appleid.apple.com → Sign-In & Security",
      'Click "App-Specific Passwords" → Generate password',
      "Name it Sortify and copy the password",
      "Use your @icloud.com address and that password below",
    ],
    appPasswordUrl: "https://appleid.apple.com/account/manage",
  },
  {
    id: "other",
    name: "Other / Custom",
    host: "",
    port: 993,
    bg: "bg-muted/30",
    border: "border-border",
    accent: "text-muted-foreground",
    placeholder: "you@example.com",
    logo: (
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
        <Settings2 className="w-6 h-6 text-muted-foreground" />
      </div>
    ),
    steps: ["Enter your IMAP server host and port below, then use an app-specific password if your provider supports it."],
  },
];

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: syncStatus, isLoading: syncLoading } = useGetSyncStatus();
  const { data: imapConfig, isLoading: configLoading } = useGetImapConfig();
  const triggerSync = useTriggerSync();
  const saveConfig = useSaveImapConfig();
  const testConfig = useTestImapConfig();

  const [editing, setEditing] = useState(false);
  const [step, setStep] = useState<"pick" | "form">("pick");
  const [provider, setProvider] = useState<Provider | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [customHost, setCustomHost] = useState("");
  const [customPort, setCustomPort] = useState("993");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const startEditing = () => {
    setStep("pick");
    setProvider(null);
    setEmail("");
    setPassword("");
    setTestResult(null);
    setEditing(true);
  };

  const pickProvider = (p: Provider) => {
    setProvider(p);
    setCustomHost(p.host);
    setCustomPort(String(p.port));
    setTestResult(null);
    setStep("form");
  };

  const imapHost = provider?.id === "other" ? customHost : (provider?.host ?? "");
  const imapPort = provider?.id === "other" ? Number(customPort) : (provider?.port ?? 993);
  const isValid = !!email.trim() && !!password.trim() && !!imapHost;

  const handleTest = () => {
    setTestResult(null);
    testConfig.mutate(
      { data: { email: email.trim(), imapHost, imapPort, username: email.trim(), password, useSsl: true } },
      {
        onSuccess: (r) => setTestResult(r),
        onError: () => setTestResult({ success: false, message: "Test request failed. Check your connection." }),
      }
    );
  };

  const handleSave = () => {
    saveConfig.mutate(
      { data: { email: email.trim(), imapHost, imapPort, username: email.trim(), password, useSsl: true } },
      {
        onSuccess: () => {
          toast.success("Email connected!", { description: `${email.trim()} is ready to sync.` });
          queryClient.invalidateQueries({ queryKey: getGetImapConfigQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetSyncStatusQueryKey() });
          setEditing(false);
        },
        onError: () => toast.error("Failed to save — please try again."),
      }
    );
  };

  const handleSync = () => {
    triggerSync.mutate(undefined, {
      onSuccess: () => {
        toast.success("Sync started", { description: "Fetching and categorising your emails…" });
        queryClient.invalidateQueries({ queryKey: getGetSyncStatusQueryKey() });
      },
      onError: () => toast.error("Could not start sync."),
    });
  };

  /* Loading */
  if (configLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* ── Connected + not editing ── */
  if (imapConfig?.configured && !editing) {
    return (
      <div className="space-y-8 max-w-2xl mx-auto animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your email connection and sync.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email Connection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{imapConfig.email}</p>
                <p className="text-sm text-muted-foreground">{imapConfig.imapHost} · SSL</p>
              </div>
              <Button variant="outline" size="sm" onClick={startEditing}>Change</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="w-4 h-4 text-primary" />
              Sync
            </CardTitle>
            <CardDescription>Fetches your last 100 inbox emails and sorts them with AI.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/40 border border-border rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Last synced</p>
              <p className="font-semibold text-sm">
                {syncStatus?.lastSyncAt
                  ? format(new Date(syncStatus.lastSyncAt), "MMM d 'at' h:mm a")
                  : "Never"}
              </p>
            </div>
            <div className="p-4 bg-muted/40 border border-border rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Total indexed</p>
              <p className="font-semibold text-sm">{syncStatus?.totalEmails ?? 0} emails</p>
            </div>
          </CardContent>
          <CardFooter className="border-t border-border pt-4 flex justify-end">
            <Button
              onClick={handleSync}
              disabled={!syncStatus?.connected || !!syncStatus?.isSyncing || triggerSync.isPending}
            >
              {syncStatus?.isSyncing || triggerSync.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing…</>
                : "Sync Now"}
            </Button>
          </CardFooter>
        </Card>

        <AISettingsCard />
      </div>
    );
  }

  /* ── Step 1: Provider picker ── */
  if (!editing || step === "pick") {
    return (
      <div className="space-y-8 max-w-2xl mx-auto animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Connect your email</h1>
          <p className="text-muted-foreground mt-1 text-sm">Choose your email provider to get started.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => pickProvider(p)}
              className={cn(
                "flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-150",
                "hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-none cursor-pointer",
                p.bg, p.border
              )}
            >
              {p.logo}
              <span className={cn("font-semibold text-sm", p.accent)}>{p.name}</span>
            </button>
          ))}
        </div>

        {imapConfig?.configured && (
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        )}

        <AISettingsCard />
      </div>
    );
  }

  /* ── Step 2: Credentials form ── */
  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-500">
      <div>
        <button
          onClick={() => setStep("pick")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back to providers
        </button>
        <div className="flex items-center gap-3">
          {provider?.logo}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Connect {provider?.name}</h1>
            <p className="text-muted-foreground text-sm">Enter your credentials below.</p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className={cn("rounded-xl border p-5 space-y-3", provider?.bg, provider?.border)}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">How to get an app password</p>
          {provider?.appPasswordUrl && (
            <a
              href={provider.appPasswordUrl}
              target="_blank"
              rel="noreferrer"
              className={cn("inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2", provider.accent)}
            >
              Open <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        <ol className="space-y-1.5">
          {provider?.steps.map((s, i) => (
            <li key={i} className="flex gap-2.5 text-sm">
              <span className={cn("font-bold text-xs mt-0.5 flex-shrink-0 w-4", provider.accent)}>{i + 1}.</span>
              <span className="text-foreground/80">{s}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder={provider?.placeholder ?? "you@example.com"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">App password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Paste your app password here"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && isValid && handleTest()}
            />
            <p className="text-xs text-muted-foreground">
              Use the app-specific password you generated — not your regular account password.
            </p>
          </div>

          {provider?.id === "other" && (
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="host">IMAP host</Label>
                <Input
                  id="host"
                  placeholder="imap.example.com"
                  value={customHost}
                  onChange={(e) => setCustomHost(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  value={customPort}
                  onChange={(e) => setCustomPort(e.target.value)}
                />
              </div>
            </div>
          )}

          {testResult && (
            <div className={cn(
              "p-3 rounded-lg text-sm border",
              testResult.success
                ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400"
                : "bg-destructive/10 border-destructive/20 text-destructive"
            )}>
              {testResult.message}
            </div>
          )}
        </CardContent>

        <CardFooter className="border-t border-border pt-4 gap-3 flex-wrap">
          <Button variant="outline" onClick={handleTest} disabled={!isValid || testConfig.isPending}>
            {testConfig.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Testing…</> : "Test Connection"}
          </Button>
          <Button onClick={handleSave} disabled={!isValid || saveConfig.isPending}>
            {saveConfig.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connecting…</> : "Connect Account"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
