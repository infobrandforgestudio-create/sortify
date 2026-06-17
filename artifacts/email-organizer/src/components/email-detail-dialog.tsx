import { useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useGetEmail, useAssignEmailCategory, useListCategories, getListEmailsQueryKey, getGetEmailQueryKey, getGetStatsQueryKey, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Tag, Paperclip, Download, FileText, Image, File } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmailDetailDialogProps {
  emailId: number | null;
  onClose: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function attachmentIcon(contentType: string) {
  if (contentType.startsWith("image/")) return <Image className="w-4 h-4" />;
  if (contentType === "application/pdf" || contentType.includes("document")) return <FileText className="w-4 h-4" />;
  return <File className="w-4 h-4" />;
}

function EmailBody({ htmlBody, textBody }: { htmlBody: string; textBody: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const autoResize = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (doc?.body) {
        iframe.style.height = `${doc.body.scrollHeight + 32}px`;
      }
    } catch {
      // cross-origin — won't happen with srcdoc but guard anyway
    }
  }, []);

  useEffect(() => {
    // Re-check height after fonts/images may have loaded
    const timer = setTimeout(autoResize, 500);
    return () => clearTimeout(timer);
  }, [htmlBody, autoResize]);

  if (htmlBody) {
    // Inject base styles so the email looks clean inside the iframe
    const styledHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #1a1a2e;
    margin: 0;
    padding: 0;
    background: transparent;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  a { color: #352580; }
  img { max-width: 100%; height: auto; }
  table { max-width: 100%; border-collapse: collapse; }
  pre, code { white-space: pre-wrap; word-break: break-all; font-size: 13px; }
</style>
</head>
<body>${htmlBody}</body>
</html>`;

    return (
      <iframe
        ref={iframeRef}
        sandbox="allow-same-origin"
        srcDoc={styledHtml}
        title="Email content"
        className="w-full border-0 bg-transparent"
        style={{ minHeight: 200 }}
        onLoad={autoResize}
      />
    );
  }

  return (
    <div className="whitespace-pre-wrap font-sans text-sm text-foreground/90 leading-relaxed">
      {textBody || "No content"}
    </div>
  );
}

export function EmailDetailDialog({ emailId, onClose }: EmailDetailDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: email, isLoading } = useGetEmail(emailId!, {
    query: {
      enabled: !!emailId,
      queryKey: getGetEmailQueryKey(emailId!),
    }
  });

  const { data: categories } = useListCategories();
  
  const assignCategory = useAssignEmailCategory();

  const handleAssignCategory = (categoryId: number | null) => {
    if (!emailId) return;
    
    assignCategory.mutate(
      { id: emailId, data: { categoryId } },
      {
        onSuccess: (updatedEmail) => {
          queryClient.setQueryData(getGetEmailQueryKey(emailId), updatedEmail);
          queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
          queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
          
          toast({
            title: "Category assigned",
            description: `Email moved to ${updatedEmail.categoryName || 'Inbox'}`,
          });
        }
      }
    );
  };

  const getAttachmentUrl = (attId: number) =>
    `/api/emails/${emailId}/attachments/${attId}`;

  return (
    <Dialog open={!!emailId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{email?.subject ?? "Email"}</DialogTitle>
          <DialogDescription>Email detail view</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/4" />
            <div className="pt-8 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ) : email ? (
          <>
            {/* Toolbar */}
            <div className="border-b border-border px-4 py-3 flex items-center gap-3 bg-muted/30 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8" disabled={assignCategory.isPending}>
                    <Tag className="w-3.5 h-3.5 mr-2" />
                    {email.categoryName || "Uncategorized"}
                    <ChevronDown className="w-3.5 h-3.5 ml-2 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={() => handleAssignCategory(null)}>
                    <span className="w-full">Uncategorized</span>
                  </DropdownMenuItem>
                  {categories?.map((cat) => (
                    <DropdownMenuItem key={cat.id} onClick={() => handleAssignCategory(cat.id)}>
                      <div className="flex items-center gap-2 w-full">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span>{cat.name}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {email.categoryName && (
                <Badge
                  variant="outline"
                  style={{
                    backgroundColor: email.categoryColor ? `${email.categoryColor}15` : undefined,
                    color: email.categoryColor || undefined,
                    borderColor: email.categoryColor ? `${email.categoryColor}30` : undefined,
                  }}
                >
                  {email.categoryName}
                </Badge>
              )}

              {email.attachments.length > 0 && (
                <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Paperclip className="w-3.5 h-3.5" />
                  {email.attachments.length} attachment{email.attachments.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>

            {/* Email header */}
            <div className="px-6 pt-5 pb-4 border-b border-border shrink-0">
              <h2 className="text-xl font-semibold mb-3 tracking-tight text-foreground leading-snug">
                {email.subject}
              </h2>
              <div className="flex justify-between items-center">
                <div className="font-medium text-foreground text-sm">{email.fromAddress}</div>
                <div className="text-xs text-muted-foreground">{formatDate(email.receivedAt)}</div>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              {/* Attachments */}
              {email.attachments.length > 0 && (
                <div className="px-6 py-4 border-b border-border bg-muted/20">
                  <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <Paperclip className="w-3.5 h-3.5" />
                    Attachments
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {email.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={getAttachmentUrl(att.id)}
                        download={att.filename}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors text-sm group max-w-[240px]"
                      >
                        <span className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
                          {attachmentIcon(att.contentType)}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-foreground text-xs truncate">{att.filename}</span>
                          <span className="text-xs text-muted-foreground">{formatFileSize(att.size)}</span>
                        </div>
                        <Download className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors ml-auto shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Email body */}
              <div className="px-6 py-5">
                <EmailBody
                  htmlBody={email.htmlBody}
                  textBody={email.body}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="p-6 text-center text-muted-foreground">Email not found</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
