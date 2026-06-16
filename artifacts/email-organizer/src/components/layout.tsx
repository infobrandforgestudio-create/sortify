import { Sidebar } from "./sidebar";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex w-full">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-[100dvh] overflow-auto">
        <div className="p-8 max-w-6xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
