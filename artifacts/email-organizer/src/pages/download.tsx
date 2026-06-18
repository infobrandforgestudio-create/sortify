import { useState } from "react";
import { Download, Terminal, Package, CheckCircle2, Apple, Monitor, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative">
      <pre className="bg-zinc-900 text-zinc-100 rounded-lg px-4 py-3 text-sm font-mono overflow-x-auto pr-12">
        {code}
      </pre>
      <CopyButton text={code} />
    </div>
  );
}

const STEPS = [
  {
    icon: Download,
    title: "Download the source",
    description: "Click the button below to download the Sortify desktop source package as a zip.",
  },
  {
    icon: Terminal,
    title: "Install dependencies",
    description: "Open a terminal in the extracted folder and run:",
    code: "pnpm install",
  },
  {
    icon: Package,
    title: "Build your installer",
    description: "Package the app for your platform:",
    codeMac: "pnpm run dist:mac",
    codeWin: "pnpm run dist:win",
  },
  {
    icon: CheckCircle2,
    title: "Install & run",
    description: "Find the installer in the release/ folder:",
    noteMac: "Open Sortify-1.0.0.dmg and drag to Applications",
    noteWin: "Run Sortify-Setup-1.0.0.exe",
  },
];

export default function DownloadPage() {
  const [platform, setPlatform] = useState<"mac" | "win">("mac");
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const a = document.createElement("a");
      a.href = "/api/download/source";
      a.download = "sortify-desktop.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setTimeout(() => setDownloading(false), 2000);
    }
  };

  return (
    <div className="space-y-10 max-w-2xl mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Download Desktop App</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Get Sortify as a native desktop app — your data stays on your machine, no cloud required.
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

          <Button size="lg" onClick={handleDownload} disabled={downloading} className="gap-2 px-8">
            {downloading ? (
              <>Preparing download…</>
            ) : (
              <><Download className="w-4 h-4" /> Download for {platform === "mac" ? "macOS" : "Windows"}</>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            Downloads the source package · Build requires Node.js + pnpm
          </p>
        </div>

        <CardContent className="pt-6">
          <h3 className="font-semibold text-sm mb-4 text-muted-foreground uppercase tracking-wider">
            Build steps
          </h3>
          <ol className="space-y-5">
            {STEPS.map((step, i) => (
              <li key={i} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{i + 1}</span>
                </div>
                <div className="flex-1 space-y-2 pt-1">
                  <div>
                    <p className="font-medium text-sm">{step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                  {step.code && <CodeBlock code={step.code} />}
                  {(step.codeMac || step.codeWin) && (
                    <CodeBlock code={platform === "mac" ? (step.codeMac ?? "") : (step.codeWin ?? "")} />
                  )}
                  {(step.noteMac || step.noteWin) && (
                    <p className="text-sm text-muted-foreground italic">
                      {platform === "mac" ? step.noteMac : step.noteWin}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Requirements</CardTitle>
          <CardDescription>You'll need these installed on your machine before building.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { name: "Node.js 20+", note: "nodejs.org", href: "https://nodejs.org" },
            { name: "pnpm", note: "npm install -g pnpm", href: "https://pnpm.io" },
            { name: platform === "mac" ? "Xcode Command Line Tools" : "Visual Studio Build Tools", note: platform === "mac" ? "xcode-select --install" : "For native module compilation", href: platform === "mac" ? "#" : "https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022" },
          ].map((req) => (
            <div key={req.name} className="flex items-center justify-between text-sm">
              <span className="font-medium">{req.name}</span>
              <a href={req.href} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground underline underline-offset-2 font-mono text-xs">
                {req.note}
              </a>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
