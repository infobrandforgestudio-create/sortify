import { useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetCategory,
  useListEmails,
  useListCategoryRules,
  useCreateCategoryRule,
  useDeleteCategoryRule,
  getListCategoryRulesQueryKey,
  getListCategoriesQueryKey,
} from "@workspace/api-client-react";
import { EmailList } from "@/components/email-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Zap, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const FIELD_LABELS: Record<string, string> = {
  sender: "Sender",
  subject: "Subject",
  body: "Body",
};

const OPERATOR_LABELS: Record<string, string> = {
  contains: "contains",
  equals: "equals",
  starts_with: "starts with",
  ends_with: "ends with",
};

export default function CategoryEmails() {
  const { id } = useParams<{ id: string }>();
  const categoryId = parseInt(id, 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: category, isLoading: isCategoryLoading } = useGetCategory(categoryId);
  const { data: emailData, isLoading: isEmailsLoading } = useListEmails({ categoryId });
  const { data: rules, isLoading: isRulesLoading } = useListCategoryRules(categoryId);

  const createRule = useCreateCategoryRule();
  const deleteRule = useDeleteCategoryRule();

  const [showAddRule, setShowAddRule] = useState(false);
  const [fieldType, setFieldType] = useState<"sender" | "subject" | "body">("sender");
  const [operator, setOperator] = useState<"contains" | "equals" | "starts_with" | "ends_with">("contains");
  const [value, setValue] = useState("");

  const handleAddRule = () => {
    if (!value.trim()) return;
    createRule.mutate(
      { id: categoryId, data: { fieldType, operator, value: value.trim() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCategoryRulesQueryKey(categoryId) });
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
          setValue("");
          setShowAddRule(false);
          toast({ title: "Rule added", description: "New emails will be sorted by this rule automatically." });
        },
        onError: () => {
          toast({ title: "Failed to add rule", variant: "destructive" });
        },
      }
    );
  };

  const handleDeleteRule = (ruleId: number) => {
    deleteRule.mutate(
      { id: categoryId, ruleId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCategoryRulesQueryKey(categoryId) });
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
          toast({ title: "Rule removed" });
        },
      }
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div>
        <Link href="/categories" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          All Categories
        </Link>

        {isCategoryLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        ) : category ? (
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: category.color }} />
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{category.name}</h1>
              {category.description && (
                <p className="text-muted-foreground mt-0.5 text-sm">{category.description}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-3xl font-bold tracking-tight text-foreground">Category Not Found</div>
        )}
      </div>

      {/* Rules Section */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="font-semibold text-sm">Sorting Rules</span>
            <span className="text-xs text-muted-foreground">
              — matched emails skip AI and go straight here
            </span>
          </div>
          {!showAddRule && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => setShowAddRule(true)}>
              <Plus className="w-3.5 h-3.5" />
              Add Rule
            </Button>
          )}
        </div>

        {/* Existing rules */}
        {isRulesLoading ? (
          <div className="flex gap-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-40" />
          </div>
        ) : rules && rules.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {rules.map((rule) => (
              <Badge
                key={rule.id}
                variant="secondary"
                className="gap-1.5 pr-1 text-xs font-normal"
              >
                <span className="font-medium">{FIELD_LABELS[rule.fieldType]}</span>
                <span className="text-muted-foreground">{OPERATOR_LABELS[rule.operator]}</span>
                <span className="font-mono bg-background/60 px-1 rounded">{rule.value}</span>
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="ml-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive p-0.5 transition-colors"
                  disabled={deleteRule.isPending}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          !showAddRule && (
            <p className="text-xs text-muted-foreground">
              No rules yet. Add rules to automatically sort matching emails without waiting for AI.
            </p>
          )
        )}

        {/* Add rule form */}
        {showAddRule && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Select value={fieldType} onValueChange={(v) => setFieldType(v as typeof fieldType)}>
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sender">Sender</SelectItem>
                <SelectItem value="subject">Subject</SelectItem>
                <SelectItem value="body">Body</SelectItem>
              </SelectContent>
            </Select>

            <Select value={operator} onValueChange={(v) => setOperator(v as typeof operator)}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">contains</SelectItem>
                <SelectItem value="equals">equals</SelectItem>
                <SelectItem value="starts_with">starts with</SelectItem>
                <SelectItem value="ends_with">ends with</SelectItem>
              </SelectContent>
            </Select>

            <Input
              className="h-8 text-xs flex-1 min-w-[120px]"
              placeholder='e.g. @amazon.com, "invoice", "unsubscribe"'
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddRule()}
              autoFocus
            />

            <div className="flex gap-1.5">
              <Button size="sm" className="h-8 text-xs" onClick={handleAddRule} disabled={!value.trim() || createRule.isPending}>
                Save Rule
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setShowAddRule(false); setValue(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Email list */}
      <div className="flex-1 overflow-auto rounded-md">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-muted-foreground">
            {emailData?.total ?? 0} email{emailData?.total !== 1 ? "s" : ""} in this category
          </span>
        </div>
        <EmailList
          emails={emailData?.emails}
          isLoading={isEmailsLoading}
        />
      </div>
    </div>
  );
}
