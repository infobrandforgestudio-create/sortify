import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useGetEmail, useAssignEmailCategory, useListCategories, getListEmailsQueryKey, getGetEmailQueryKey, getGetStatsQueryKey, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmailDetailDialogProps {
  emailId: number | null;
  onClose: () => void;
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
          // Update the specific email cache
          queryClient.setQueryData(getGetEmailQueryKey(emailId), updatedEmail);
          
          // Invalidate lists and stats
          queryClient.invalidateQueries({ queryKey: ['/api/emails'] }); // Approximate clear for all lists
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

  return (
    <Dialog open={!!emailId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
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
            <div className="border-b border-border p-4 flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-3">
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
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <h2 className="text-2xl font-semibold mb-6 tracking-tight text-foreground">{email.subject}</h2>
              
              <div className="flex justify-between items-start mb-8 pb-4 border-b border-border">
                <div>
                  <div className="font-medium text-foreground">{email.fromAddress}</div>
                </div>
                <div className="text-sm text-muted-foreground text-right">
                  {formatDate(email.receivedAt)}
                </div>
              </div>

              <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed text-foreground/90">
                {/* Normally we'd use dangerouslySetInnerHTML if it was HTML, but let's just display text */}
                <div className="whitespace-pre-wrap font-sans text-sm">
                  {email.body || email.snippet}
                </div>
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
