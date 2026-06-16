import { useState } from "react";
import { useParams } from "wouter";
import { useGetCategory, useListEmails } from "@workspace/api-client-react";
import { EmailList } from "@/components/email-list";
import { Skeleton } from "@/components/ui/skeleton";

export default function CategoryEmails() {
  const { id } = useParams<{ id: string }>();
  const categoryId = parseInt(id, 10);

  const { data: category, isLoading: isCategoryLoading } = useGetCategory(categoryId);
  
  const { data: emailData, isLoading: isEmailsLoading } = useListEmails({ categoryId });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 flex flex-col h-[calc(100vh-4rem)]">
      {isCategoryLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      ) : category ? (
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }} />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{category.name}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{category.description}</p>
          </div>
        </div>
      ) : (
        <div className="text-3xl font-bold tracking-tight text-foreground">Category Not Found</div>
      )}

      <div className="flex-1 overflow-auto rounded-md">
        <EmailList 
          emails={emailData?.emails} 
          isLoading={isEmailsLoading} 
        />
      </div>
    </div>
  );
}
