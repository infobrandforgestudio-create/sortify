import { useState } from "react";
import { Email } from "@workspace/api-client-react/src/generated/api.schemas";
import { formatShortDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmailDetailDialog } from "./email-detail-dialog";
import { cn } from "@/lib/utils";

interface EmailListProps {
  emails: Email[] | undefined;
  isLoading: boolean;
}

export function EmailList({ emails, isLoading }: EmailListProps) {
  const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-card border border-border rounded-md animate-pulse p-4 flex items-center">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/2 ml-4" />
          </div>
        ))}
      </div>
    );
  }

  if (!emails || emails.length === 0) {
    return (
      <div className="text-center py-12 bg-card border border-border rounded-lg border-dashed">
        <p className="text-muted-foreground">No emails found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-[1px] bg-border border border-border rounded-md overflow-hidden">
      {emails.map((email) => (
        <div
          key={email.id}
          onClick={() => setSelectedEmailId(email.id)}
          className={cn(
            "bg-card hover:bg-accent/50 transition-colors p-3 px-4 flex items-center cursor-pointer group text-sm",
            !email.isRead && "font-semibold bg-accent/20"
          )}
        >
          <div className="w-48 truncate pr-4 text-foreground/80">
            {email.fromAddress}
          </div>
          
          {email.categoryId && email.categoryName && (
            <div className="w-32 flex-shrink-0 pr-4">
              <Badge 
                variant="outline" 
                className="text-[11px] font-medium"
                style={{
                  backgroundColor: email.categoryColor ? `${email.categoryColor}15` : undefined,
                  color: email.categoryColor || undefined,
                  borderColor: email.categoryColor ? `${email.categoryColor}30` : undefined,
                }}
              >
                {email.categoryName}
              </Badge>
            </div>
          )}

          <div className="flex-1 truncate pr-4 flex items-baseline gap-2">
            <span className="truncate">{email.subject}</span>
            <span className="text-muted-foreground font-normal text-xs truncate">
              - {email.snippet}
            </span>
          </div>

          <div className="w-16 text-right flex-shrink-0 text-muted-foreground text-xs font-normal">
            {formatShortDate(email.receivedAt)}
          </div>
        </div>
      ))}

      <EmailDetailDialog 
        emailId={selectedEmailId} 
        onClose={() => setSelectedEmailId(null)} 
      />
    </div>
  );
}
