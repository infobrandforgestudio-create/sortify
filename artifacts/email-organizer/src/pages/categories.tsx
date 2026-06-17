import { useState } from "react";
import { useListCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, getListCategoriesQueryKey, getGetStatsQueryKey } from "@workspace/api-client-react";
import { Category } from "@workspace/api-client-react/src/generated/api.schemas";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Tag, Archive, ChevronRight, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";

export default function Categories() {
  const { data: categories, isLoading } = useListCategories();
  const [, navigate] = useLocation();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const openCreate = () => {
    setEditingCategory(null);
    setName("");
    setDescription("");
    setColor("#6366f1");
    setIsFormOpen(true);
  };

  const openEdit = (e: React.MouseEvent, cat: Category) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description);
    setColor(cat.color);
    setIsFormOpen(true);
  };

  const confirmDelete = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteId(id);
  };

  const handleSave = () => {
    if (!name.trim()) return;

    if (editingCategory) {
      updateCategory.mutate(
        { id: editingCategory.id, data: { name, description, color } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
            setIsFormOpen(false);
            toast({ title: "Category updated" });
          }
        }
      );
    } else {
      createCategory.mutate(
        { data: { name, description, color } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
            setIsFormOpen(false);
            toast({ title: "Category created" });
          }
        }
      );
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteCategory.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
          setDeleteId(null);
          toast({ title: "Category deleted" });
        }
      }
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Categories</h1>
          <p className="text-muted-foreground mt-1 text-sm">Click a category to view emails and manage its sorting rules.</p>
        </div>
        
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          New Category
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : categories?.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl border-dashed">
          <Archive className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground mb-1">No Categories</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Create categories to teach the AI how to sort your incoming emails.
          </p>
          <Button onClick={openCreate} variant="outline" className="mt-6">
            Create First Category
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories?.map((cat) => (
            <Link key={cat.id} href={`/categories/${cat.id}`}>
              <Card className="group relative overflow-hidden transition-all hover:shadow-md hover:border-primary/30 cursor-pointer h-full">
                <div 
                  className="absolute top-0 left-0 w-1 h-full" 
                  style={{ backgroundColor: cat.color }} 
                />
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-muted-foreground" />
                      <h3 className="font-semibold text-lg">{cat.name}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => openEdit(e, cat)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => confirmDelete(e, cat.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                    {cat.description || "No description provided."}
                  </p>

                  <div className="flex justify-between items-center pt-4 border-t border-border">
                    <div className="flex items-center gap-3">
                      <span className="text-sm">
                        <span className="font-medium">{cat.emailCount}</span>
                        <span className="text-muted-foreground ml-1">emails</span>
                      </span>
                      {cat.ruleCount > 0 && (
                        <Badge variant="secondary" className="text-xs gap-1 py-0">
                          <Zap className="w-3 h-3" />
                          {cat.ruleCount} {cat.ruleCount === 1 ? "rule" : "rules"}
                        </Badge>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "New Category"}</DialogTitle>
            <DialogDescription>Define a category for organizing emails. Add sorting rules after creating it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="e.g. Invoices, Newsletters, Action Required" 
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Description <span className="text-muted-foreground font-normal">(used by AI)</span></Label>
              <Textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="What kinds of emails belong here? The AI uses this to categorize emails." 
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 items-center">
                <Input 
                  type="color" 
                  value={color} 
                  onChange={e => setColor(e.target.value)} 
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input 
                  value={color} 
                  onChange={e => setColor(e.target.value)} 
                  className="flex-1 font-mono uppercase"
                  maxLength={7}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createCategory.isPending || updateCategory.isPending}>
              {editingCategory ? "Save Changes" : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this category? Emails assigned to it will become uncategorized.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteCategory.isPending}>
              Delete Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
