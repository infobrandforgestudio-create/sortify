import { useState } from "react";
import {
  useListCategories,
  useListCategoryRules,
  useCreateCategoryRule,
  useDeleteCategoryRule,
  getListCategoryRulesQueryKey,
  getListCategoriesQueryKey,
} from "@workspace/api-client-react";
import { Category, CategoryRule } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Plus, X, Archive } from "lucide-react";
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

interface RuleFormState {
  fieldType: "sender" | "subject" | "body";
  operator: "contains" | "equals" | "starts_with" | "ends_with";
  value: string;
}

const DEFAULT_FORM: RuleFormState = {
  fieldType: "sender",
  operator: "contains",
  value: "",
};

function CategoryRulesCard({ category }: { category: Category }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: rules, isLoading } = useListCategoryRules(category.id);
  const createRule = useCreateCategoryRule();
  const deleteRule = useDeleteCategoryRule();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<RuleFormState>(DEFAULT_FORM);

  const handleAdd = () => {
    if (!form.value.trim()) return;
    createRule.mutate(
      { id: category.id, data: { fieldType: form.fieldType, operator: form.operator, value: form.value.trim() } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCategoryRulesQueryKey(category.id) });
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
          setForm(DEFAULT_FORM);
          setShowForm(false);
          toast({ title: "Rule added" });
        },
        onError: () => toast({ title: "Failed to add rule", variant: "destructive" }),
      }
    );
  };

  const handleDelete = (rule: CategoryRule) => {
    deleteRule.mutate(
      { id: category.id, ruleId: rule.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCategoryRulesQueryKey(category.id) });
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
          toast({ title: "Rule removed" });
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3 pt-4 px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: category.color }} />
            <span className="font-semibold text-base">{category.name}</span>
            {rules && rules.length > 0 && (
              <Badge variant="secondary" className="text-xs gap-1 py-0">
                <Zap className="w-3 h-3" />
                {rules.length} {rules.length === 1 ? "rule" : "rules"}
              </Badge>
            )}
          </div>
          {!showForm && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => setShowForm(true)}>
              <Plus className="w-3.5 h-3.5" />
              Add Rule
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-4 space-y-3">
        {isLoading ? (
          <div className="flex gap-2">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-36" />
          </div>
        ) : rules && rules.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {rules.map((rule) => (
              <Badge key={rule.id} variant="secondary" className="gap-1.5 pr-1 text-xs font-normal">
                <span className="font-medium">{FIELD_LABELS[rule.fieldType]}</span>
                <span className="text-muted-foreground">{OPERATOR_LABELS[rule.operator]}</span>
                <span className="font-mono bg-background/60 px-1 rounded">{rule.value}</span>
                <button
                  onClick={() => handleDelete(rule)}
                  className="ml-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive p-0.5 transition-colors"
                  disabled={deleteRule.isPending}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : !showForm ? (
          <p className="text-xs text-muted-foreground">
            No rules yet — emails will be sorted by AI based on the category description.
          </p>
        ) : null}

        {showForm && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border">
            <Select value={form.fieldType} onValueChange={(v) => setForm((f) => ({ ...f, fieldType: v as RuleFormState["fieldType"] }))}>
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sender">Sender</SelectItem>
                <SelectItem value="subject">Subject</SelectItem>
                <SelectItem value="body">Body</SelectItem>
              </SelectContent>
            </Select>

            <Select value={form.operator} onValueChange={(v) => setForm((f) => ({ ...f, operator: v as RuleFormState["operator"] }))}>
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
              className="h-8 text-xs flex-1 min-w-[140px]"
              placeholder='e.g. @amazon.com, "invoice", "newsletter"'
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              autoFocus
            />

            <div className="flex gap-1.5">
              <Button size="sm" className="h-8 text-xs" onClick={handleAdd} disabled={!form.value.trim() || createRule.isPending}>
                Save
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setShowForm(false); setForm(DEFAULT_FORM); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Rules() {
  const { data: categories, isLoading } = useListCategories();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Rules</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Rules sort emails instantly — matched emails skip AI and go straight to the right category.
        </p>
      </div>

      <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40 text-sm text-amber-800 dark:text-amber-300 flex gap-3 items-start">
        <Zap className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
        <div>
          <span className="font-medium">How rules work:</span> When a new email arrives, rules are checked first. If a rule matches, the email is filed instantly without using AI. Rules are faster and more predictable — use them for senders or subjects you always know where to file.
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : !categories || categories.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl border-dashed">
          <Archive className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground mb-1">No Categories Yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Create categories first, then come back here to add sorting rules to them.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => (
            <CategoryRulesCard key={cat.id} category={cat} />
          ))}
        </div>
      )}
    </div>
  );
}
