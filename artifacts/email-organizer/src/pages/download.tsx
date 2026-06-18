import { useState, useEffect } from "react";
import { Download, Package, CheckCircle2, Apple, Monitor, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const RELEASES_URL = "https://github.com/infobrandforgestudio-create/sortify/releases/latest";
const RELEASES_API  = "https://api.github.com/repos/infobrandforgestudio-create/sortify/releases/latest";

interface Asset {
  name: string;
  browser_download_url: string;
  size: number;
}

function fmt(bytes: number) {
  return bytes > 1_000_000 ? `${(bytes / 1_000_000).toFixed(0)} MB` : `${(bytes / 1_000).toFixed(0)} KB`;
}

export default function DownloadPage() {
  const [platform, setPlatform] = useState<"mac" | "win">("mac");
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(RELEASES_API)
      .then((r) => r.json())
      .then((data) => {
        if (data.assets) setAssets(data.assets);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const macAssets = assets?.filter((a) =>
    a.name.endsWith(".dmg") || (a.name.includes("mac") && a.name.endsWith(".zip"))
  ) ?? [];
  const winAssets = assets?.filter((a) =>
    a.name.endsWith(".exe") || a.name.endsWith(".msi")
  ) ?? [];

  const shown = platform === "mac" ? macAssets : winAssets;
  const ready = shown.length > 0;

  return (
    <div className="space-y-10 max-w-2xl mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Download Desktop App</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Native desktop app — your data stays on your machine, no cloud required.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-b border-border px-6 py-8 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Sortify Desktop</h2>
            <p className="text-sm text-muted-foreground mt-1">Electron · SQLite · No subscription</p>
          </div>

          <div className="flex rounded-full border border-border bg-background p-1 gap-1">
            <button
              onClick={() => setPlatform("mac")}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                platform === "mac" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Apple className="w-3.5 h-3.5" /> macOS
            </button>
            <button
              onClick={() => setPlatform("win")}
              className={cn(
                "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                platform === "win" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Monitor className="w-3.5 h-3.5" /> Windows
            </button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Checking for latest release…
            </div>
          ) : ready ? (
            <div className="flex flex-col gap-2 w-full max-w-xs">
              {shown.map((asset) => (
                <Button key={asset.name} size="lg" asChild className="gap-2 px-8">
                  <a href={asset.browser_download_url} download>
                    <Download className="w-4 h-4" />
                    {asset.name.endsWith(".dmg") ? "Download .dmg" : asset.name.endsWith(".exe") ? "Download Installer (.exe)" : asset.name}
                    <span className="ml-1 text-xs opacity-70">{fmt(asset.size)}</span>
                  </a>
                </Button>
              ))}
            </div>
          ) : error || (!loading && !ready) ? (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground">
                {error
                  ? "Couldn't load release info. Check back shortly — builds take ~10 minutes."
                  : `No ${platform === "mac" ? "macOS" : "Windows"} installer in the latest release yet.`}
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href={RELEASES_URL} target="_blank" rel="noreferrer" className="gap-2">
                  <ExternalLink className="w-3.5 h-3.5" /> View all releases on GitHub
                </a>
              </Button>
            </div>
          ) : null}
        </div>

        <CardContent className="pt-6">
          <h3 className="font-semibold text-sm mb-4 text-muted-foreground uppercase tracking-wider">
            Install Instructions
          </h3>
          <ol className="space-y-4">
            {platform === "mac" ? (
              <>
                <Step n={1} title="Download the .dmg" desc="Click the button above to download the macOS installer." />
                <Step n={2} title="Open the file" desc="Double-click the .dmg to mount it." />
                <Step n={3} title="Drag to Applications" desc='Drag the Sortify icon into the "Applications" folder shown in the window.' />
                <Step n={4} title="Open Sortify" desc="Launch from Applications. If macOS asks to confirm, click Open." icon={CheckCircle2} />
              </>
            ) : (
              <>
                <Step n={1} title="Download the installer (.exe)" desc="Click the button above to download the Windows installer." />
                <Step n={2} title="Run the installer" desc="Double-click the .exe. If Windows SmartScreen appears, click More info → Run anyway." />
                <Step n={3} title="Follow the setup wizard" desc="Choose your install location and finish setup." />
                <Step n={4} title="Open Sortify" desc="Launch from the Start Menu or desktop shortcut." icon={CheckCircle2} />
              </>
            )}
          </ol>
        </CardContent>
      </Card>

      <p className="text-xs text-center text-muted-foreground pb-4">
        Builds are created automatically on every update.{" "}
        <a href={RELEASES_URL} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
          View all releases on GitHub →
        </a>
      </p>
    </div>
  );
}

function Step({
  n, title, desc, icon: Icon = CheckCircle2,
}: {
  n: number; title: string; desc: string; icon?: typeof CheckCircle2;
}) {
  return (
    <li className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="text-sm font-bold text-primary">{n}</span>
      </div>
      <div className="flex-1 pt-1">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </li>
  );
}
