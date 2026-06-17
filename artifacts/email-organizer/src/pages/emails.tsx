import { useState, useEffect } from "react";
import { useListEmails, useListCategories } from "@workspace/api-client-react";
import { EmailList } from "@/components/email-list";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddEmailDialog } from "@/components/add-email-dialog";

export default function Emails() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [uncategorized, setUncategorized] = useState<boolean>(false);

  // very simple debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const { data: categories } = useListCategories();
  
  const { data: emailData, isLoading } = useListEmails({ 
    search: debouncedSearch || undefined,
    categoryId: categoryId || undefined,
    uncategorized: uncategorized ? true : undefined
  });

  const clearFilters = () => {
    setCategoryId(null);
    setUncategorized(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">All Emails</h1>
          <p className="text-muted-foreground mt-1 text-sm">Browse your entire inbox.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search subject or sender..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card"
            />
          </div>
          <Button onClick={() => setAddOpen(true)} className="shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            Add Email
          </Button>
        </div>
      </div>

      <AddEmailDialog open={addOpen} onOpenChange={setAddOpen} />

      <div className="flex flex-wrap items-center gap-2 pb-2">
        <Badge 
          variant={categoryId === null && !uncategorized ? "default" : "outline"}
          className="cursor-pointer font-medium"
          onClick={clearFilters}
        >
          All
        </Badge>
        <Badge 
          variant={uncategorized ? "default" : "outline"}
          className="cursor-pointer font-medium"
          onClick={() => { setUncategorized(true); setCategoryId(null); }}
        >
          Uncategorized
        </Badge>
        
        <div className="w-px h-4 bg-border mx-1" />
        
        {categories?.map((cat) => (
          <Badge
            key={cat.id}
            variant={categoryId === cat.id ? "default" : "outline"}
            className="cursor-pointer font-medium flex items-center gap-1.5"
            onClick={() => { setCategoryId(cat.id); setUncategorized(false); }}
            style={categoryId === cat.id ? { backgroundColor: cat.color, color: '#fff', borderColor: cat.color } : {}}
          >
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: categoryId === cat.id ? 'white' : cat.color }} 
            />
            {cat.name}
          </Badge>
        ))}
      </div>

      <div className="flex-1 overflow-auto rounded-md">
        <EmailList 
          emails={emailData?.emails} 
          isLoading={isLoading} 
        />
      </div>
    </div>
  );
}
