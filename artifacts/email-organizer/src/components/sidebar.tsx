import { useLocation } from "wouter";
import { Link } from "wouter";
import { 
  Inbox, 
  LayoutDashboard, 
  Settings, 
  Tags,
  Mail,
  Zap,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/emails", label: "All Emails", icon: Inbox },
    { href: "/categories", label: "Categories", icon: Tags },
    { href: "/rules", label: "Rules", icon: Zap },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border h-[100dvh] flex flex-col fixed left-0 top-0">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-sidebar-primary tracking-tight">
          <Mail className="w-6 h-6" />
          <span>Sortify</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200",
                isActive 
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <Link
          href="/download"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 w-full",
            location === "/download"
              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Download className="w-4 h-4" />
          Download App
        </Link>
        <p className="text-xs text-sidebar-foreground/50 mt-3 px-3">AI-Powered Inbox</p>
      </div>
    </div>
  );
}
